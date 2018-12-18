import { ServiceworkerSelf } from '../../../../../../../shared/types/serviceworker';
import { theme } from '../../../../../../../shared/components/theming/theme/theme';
import { VALID_THEMES_T } from '../../../../../../../shared/types/shared-types';
import { set, get } from 'idb-keyval';
import * as pgp from 'openpgp';

declare const self: ServiceworkerSelf;

const CACHE_NAME = 'password-manager';
const SERVER_PUBLIC_KEY = `SERVER_PUBLIC_KEY_START SERVER_PUBLIC_KEY_END`;
const KEY_PREFIX = 'SERVER_PUBLIC_KEY';
const DEFAULT_PUBLIC_KEY = `${KEY_PREFIX}_START ${KEY_PREFIX}_END`;
let keys: pgp.key.Key[]|null = null;

type OpenPGPBase = typeof import("openpgp");
type PGPSignature = any;
interface PGP extends OpenPGPBase {
	verify(options: {
		message: pgp.cleartext.CleartextMessage;
		signature: PGPSignature;
		publicKeys: pgp.key.Key[];
	}): Promise<{
		signatures: {
			valid: boolean;
			keyid: {
				toHex(): string;
			}
		}[];
	}>;
	signature: {
		readArmored(text: string): Promise<PGPSignature>;
	}
}

const CACHE_STATIC = [
	'/versions.json'
];

const CACHE_PAGES = [
	'/login_offline',
	'/dashboard_offline'
];

const CACHE_COMPONENTS = [
	'/entrypoints/login/login-page.js',
	'/entrypoints/dashboard/dashboard-page.js'
];

self.addEventListener('install', (event) => {
	self.skipWaiting();

	event.waitUntil((async() => {
		const cache = await caches.open(CACHE_NAME);
		await Promise.all([
			...CACHE_STATIC, 
			...CACHE_PAGES, 
			...CACHE_COMPONENTS
		].map((url) => {
			return cache.add(url).catch((err) => {
				console.log('failed to fetch', url, err);
			});
		}));
	})());
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

function race<T>(...promises: Promise<T|undefined>[]): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		promises.forEach((promise) => {
			promise.then((result) => {
				if (result !== undefined) {
					resolve(result);
				}
			}).catch(() => {});
		});
		if (promises.length === 0) {
			resolve();
		} else if (promises.length === 1) {
			promises[0].then((result) => {
				resolve(result);
			}).catch(() => {
				reject(new Error('All requests failed'));
			});
		} else {
			promises.reduce((a, b) => a.catch(() => b))
				.catch(() => reject(new Error('All requests failed')));
		}
	});
}

async function save(req: Request, res: Promise<Response>) {
	const cache = await caches.open(CACHE_NAME);
	const response = await res;
	cache.put(req, response.clone());
	return response;
}

async function fastest(req: Request) {
	return race(caches.match(req), checkHeaders(fetch(req, {
		credentials: 'include'
	})));
}

function cacheFirst(req: Request|string): Promise<Response> {
	return new Promise((resolve, reject) => {
		caches.match(req).then((res) => {
			if (res) {
				resolve(res);
			} else {
				fetch(req, {
					credentials: 'include'
				}).then(resolve, reject);
			}
		}).catch(reject);
	});
}

function arrToObj<T>(arr: [string, T][]): {
	[key: string]: T;
} {
	const obj = {} as {
		[key: string]: T;
	};
	for (const [ key, val ] of arr) {
		obj[key] = val;
	}
	return obj;
}

function renderTheme(prom: Promise<Response|undefined>): Promise<Response> {
	return new Promise<Response>((resolve, reject) => {
		prom.then(async (res) => {
			if (res === undefined) {
				resolve(res);
				return;
			}

			//Get current theme
			const themeName = await get('theme') as VALID_THEMES_T;
			const body = await res.text();
			const headers: [string, string][] = [];
			res.headers.forEach((value, key) => {
				headers.push([key, value]);
			});
			const init = {
				status: res.status,
				statusText: res.statusText,
				headers: arrToObj(headers)
			}

			resolve(new Response(body.replace(/<body/, 
				`<body style="background-color: ${theme[themeName || 'light'].background}"`), 
				init));
		}).catch(reject);
	});
}

async function notifyCompromised() {
	//Send a notification to the webpage and a separate one to
	// the user's desktop to be sure
	const clients = await (self as ServiceworkerSelf).clients.matchAll();
	clients.forEach(client => client.postMessage({
		type: 'compromised'
	}));

	const reg = (self as any).registration as ServiceWorkerRegistration;
	reg.showNotification('Connection compromised', {
		body: 'The connection you have with the server seems to be compromised' + 
			' this can either be because of a MITM attack or a compromised server' +
			', please investigate this further and be don\'t enter your password anywhere',
		renotify: true,
		actions: undefined
	})
}

async function getKey() {
	if (keys !== null) {
		return keys;
	}
	return (keys = (await pgp.key.readArmored(SERVER_PUBLIC_KEY)).keys);
}

async function checkHeaders(handler: Promise<Response>) {
	if (SERVER_PUBLIC_KEY === DEFAULT_PUBLIC_KEY) {
		//Don't check them
		return handler;
	}

	try {
		const [ response, keys ] = await Promise.all([
			handler,
			getKey()
		]);

		if (!keys) {
			notifyCompromised();
			return undefined;
		}

		const header = response.headers.get('Signed-Hash');
		if (!header) {
			notifyCompromised();
			return undefined;
		}

		const content = await response.clone().text();
		const verified = (await (pgp as PGP).verify({
			message: pgp.cleartext.fromText(content),
			publicKeys: keys,
			signature: (await (pgp as PGP).key.readArmored(header)).keys
		})).signatures[0].valid;

		if (!verified) {
			notifyCompromised();
			return undefined;
		}

		return response;
	} catch(e) {
		return undefined;
	}
}

self.addEventListener('fetch', (event) => {
	const { pathname, hostname } = new URL(event.request.url);
	if (pathname.startsWith('/api')) {
		event.respondWith(fetch(event.request, {
			credentials: 'include'
		}));
		return;
	}

	if (hostname !== location.hostname) {
		event.respondWith(fetch(event.request));
		return;
	}
	switch (pathname) {
		case '/':
		case '/login':
			//Redirect to /login anyway
			event.respondWith(race(
				renderTheme(caches.match('/login_offline')),
				checkHeaders(fetch('/login', {
					credentials: 'include'
				}))
			));
			break;
		case '/dashboard':
			if (navigator.onLine) {
				event.respondWith(race(
					renderTheme(caches.match('/dashboard_offline')),
					checkHeaders(fetch('/dashboard', {
						credentials: 'include'
					}))
				));
			} else {
				event.respondWith(cacheFirst('/dashboard_offline'));
			}
			break;
		default:
			if (pathname.startsWith('/icon')) {
				event.respondWith(save(event.request, fastest(event.request)));
				return;
			}
			event.respondWith(fastest(event.request));
	}
});

async function checkVersions() {
	if (!navigator.onLine) {
		return;
	}

	const remoteVersionsFile = await fetch('/versions.json')
	const remoteVersions = await remoteVersionsFile.clone().json().catch(() => {});
	if (!remoteVersions) {
		return;
	}

	const cache = await caches.open(CACHE_NAME);
	const localVersionsFile = (await cache.match('/versions.json')) || {
		json() {
			return {} as {
				[key: string]: string;
			};
		}
	};
	const localVersions = await localVersionsFile.json();

	await Promise.all(Object.getOwnPropertyNames(remoteVersions).map(async (file) => {
		if (!(file in localVersions)) {
			//File does not exist, we need to cache it as well
			await cache.add(file);
		} else if (localVersions[file] !== remoteVersions[file]) {
			//Out of data, re-fetch
			await cache.delete(file);
			await cache.add(file);
		}
	}));
	await cache.put('/versions.json', remoteVersionsFile);
}

interface TypedServiceWorker extends ServiceWorker {
	postMessage(message: ServiceworkerMessages, transfer?: any[]): void;
}

interface TypedServiceWorkerContainer extends ServiceWorkerContainer {
	readonly controller: TypedServiceWorker | null;
}

export interface TypedNavigator extends Navigator {
	readonly serviceWorker: TypedServiceWorkerContainer;
}

export type ServiceworkerMessages = {
	type: 'checkVersions';
}|{
	type: 'setCookie';
	data: {
		theme: string;
	}
};
self.addEventListener<ServiceworkerMessages>('message', (event) => {
	event.waitUntil((async () => {
		switch (event.data.type) {
			case 'checkVersions':
				await checkVersions();
				break;
			case 'setCookie':
				await set('theme', event.data.data.theme);
				break;
		}
	})());
});