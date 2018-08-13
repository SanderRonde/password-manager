const CACHE_NAME = 'password-manager';

const CACHE_STATIC = [
	'/js/sw.js',
	'/css/offline_fonts.css',
	'/fonts/Roboto-Bold.ttf',
	'/fonts/Roboto-Medium.ttf',
	'/fonts/Roboto-Regular.ttf',
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
		await cache.addAll([
			...CACHE_STATIC, 
			...CACHE_PAGES, 
			...CACHE_COMPONENTS
		]);
	})());
});

function race<T>(...promises: Promise<T>[]): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		promises.forEach((promise) => {
			promise.then(resolve);
		});
		promises.reduce((a, b) => a.catch(() => b))
			.catch(() => reject(new Error('All requests failed')));
	});
}

async function fastest(req: Request) {
	return race(caches.match(req), fetch(req));
}

self.addEventListener('fetch', (event) => {
	const { pathname, hostname } = new URL(event.request.url);
	if (pathname.startsWith('/api')) {
		event.respondWith(fetch(event.request));
		return;
	}

	switch (pathname) {
		case '/':
		case '/login':
			//Redirect to /login anyway
			event.respondWith(race(
				caches.match('/login_offline'),
				fetch('/login')
			));
			break;
		case '/dashboard':
			if (navigator.onLine) {
				event.respondWith(race(
					caches.match('/dashboard_offline'),
					fetch('/dasboard')
				));
			} else {
				event.respondWith(caches.match('/dashboard_offline'));
			}
			break;
		default:
			if (hostname === location.origin) {
				event.respondWith(fastest(event.request));
			} else {
				event.respondWith(fetch(event.request));
			}
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
	const localVersionsFile = await cache.match('/versions.json');
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
};
self.addEventListener<ServiceworkerMessages>('message', (event) => {
	event.waitUntil((async () => {
		switch (event.data.type) {
			case 'checkVersions':
				await checkVersions();
				break;
		}
	})());
});