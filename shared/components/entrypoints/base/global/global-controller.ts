import { Props, PROP_TYPE, wait, awaitMounted } from '../../../../lib/webcomponent-util';
import { APIToken, Hashed, Padded, MasterPasswordDecryptionpadding, ERRS } from '../../../../types/crypto';
import { StringifiedObjectId, EncryptedInstance, MasterPassword } from '../../../../types/db-types';
import { ANIMATE_TIME } from '../../../util/loadable-block/loadable-block.css';
import { LoadableBlock } from '../../../util/loadable-block/loadable-block';
import { ConfigurableWebComponent } from '../../../../lib/webcomponents';
import { decryptWithPrivateKey } from '../../../../lib/browser-crypto';
import { createClientAPIRequest } from '../../../../lib/apirequests';
import { GlobalControllerIDMap } from './global-controller-querymap';
import { PaperToast } from '../../../util/paper-toast/paper-toast';
import { ENTRYPOINT } from '../../../../types/shared-types';
import { Dashboard } from '../../base/dashboard/dashboard';
import { API_ERRS } from '../../../../types/api';
import { Login } from '../../base/login/login';

export interface GlobalControllerData {
	loginData: {
		password: string;
		login_auth: string;
		instance_id: StringifiedObjectId<EncryptedInstance>;
		private_key: string;
		server_public_key: string;
	};
	decryptHash: {
		hash: Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>;
	}
}

type EntrypointPage = Login|Dashboard;

//Should be kept in sync with server/app/lib/constants.ts
const AUTH_TOKEN_EXPIRE_TIME = 1000 * 60 * 15;

export const GlobalControllerDependencies = [
	LoadableBlock,
	PaperToast
];
export abstract class GlobalController extends ConfigurableWebComponent<GlobalControllerIDMap> {
	private _data: Map<keyof GlobalControllerData, 
		GlobalControllerData[keyof GlobalControllerData]> = new Map();
	private static readonly _entrypointURLs = {
		[ENTRYPOINT.LOGIN]: '/login',
		[ENTRYPOINT.DASHBOARD]: '/dashboard'
	};
	private static readonly _entrypointTitles = {
		[ENTRYPOINT.LOGIN]: 'Log in to your dashboard',
		[ENTRYPOINT.DASHBOARD]: 'Your Dashboard'
	};
	props = Props.define(this, {
		reflect: {
			page: {
				type: PROP_TYPE.STRING,
				exactType: '' as ENTRYPOINT
			}
		}
	});

	async _handleInitialState() {
		if (window.history.state !== null) {
			//Custom state, change to that page if not there already
			await this.changePage(window.history.state.page, true);
		}
		//Create an entry in the history
		window.history.replaceState({
			page: this.props.page
		}, GlobalController._entrypointTitles[this.props.page],
			GlobalController._entrypointURLs[this.props.page]);
		this._setTitle(GlobalController._entrypointTitles[this.props.page]);

		window.addEventListener('popstate', (e) => {
			if (e.state === null) {
				//Could only be the login page
				this.changePage(ENTRYPOINT.LOGIN, true);
			} else {
				this.changePage(e.state.page, true);
			}
		});
	}

	get content(): HTMLElement[] {
		const slotContent = this.$.slotContent.assignedNodes()
			.filter((node) => {
				//HTMLElement.ELEMENT_NODE = 1
				return node.nodeType === 1;
			}) as HTMLElement[];
		const regularContent = this.$.content.children
		return [...slotContent, ...Array.prototype.slice.apply(regularContent)];
	}

	get currentContent(): EntrypointPage|null {
		const content = this.content;
		for (const node of content) {
			if (node.tagName.toLowerCase() === `${this.props.page}-page`) {
				return node as EntrypointPage;
			}
		}
		return null;
	}

	storeData<T extends keyof GlobalControllerData>(type: T, data: GlobalControllerData[T]) {
		this._data.set(type, data);
	}

	getData<T extends keyof GlobalControllerData>(type: T): GlobalControllerData[T]|null {
		if (this._data.has(type)) {
			return this._data.get(type)!;
		}
		return null;
	}

	private _requestCount: number = 0;
	getRequestCount() {
		const num = this._requestCount;
		this._requestCount++;
		return num;
	}

	private _token: APIToken|null = null;
	setAPIToken(token: APIToken, count: number) {
		const prevToken = this._token;
		this._token = token;
		this._requestCount = count;

		if (prevToken === null) {
			setInterval(() => {
				this._refreshToken();
			}, AUTH_TOKEN_EXPIRE_TIME);
		}
	}

	private async _refreshToken() {
		const data = this.getData('loginData');
		if (!data) {
			PaperToast.createHidable('Failed to get server auth data, API token will not be' +
				' extended and will time out in 3 minutes', PaperToast.DURATION.LONG);
			return;
		}
		const request = createClientAPIRequest({
			publicKey: data.server_public_key
		}, '/api/instance/extend_key', {
			instance_id: data.instance_id
		}, {
			old_token: this._token!,
			count: this.getRequestCount()
		});
		const response = await request.fn();
		if (response.success) {
			const decryptedToken = decryptWithPrivateKey(response.data.auth_token,
				data.private_key);
			const decryptedCount = decryptWithPrivateKey(response.data.count,
				data.private_key);
			if (decryptedToken === ERRS.INVALID_DECRYPT || decryptedCount === ERRS.INVALID_DECRYPT) {
				PaperToast.createHidable('Failed to decrypt serve response, API token will not be' +
					' extended and will time out in 3 minutes', PaperToast.DURATION.LONG);
				return;
			}
			this._token = decryptedToken;
			this._requestCount = decryptedCount;
		} else {
			switch (response.ERR) {
				case API_ERRS.CLIENT_ERR:
					PaperToast.createHidable('Failed to send API token extension request, ' +
						'it will time out in 3 minutes');
					break;
				case API_ERRS.INVALID_CREDENTIALS:
					if (response.error === 'attempt to extend expired token') {
						PaperToast.createHidable('Periodical API token renewal attempted to extend' +
							' an expired token, all keys for this instance are terminated');
					} else if (response.error === 'attempt to extend invalid token') {
						PaperToast.createHidable('Your API token was invalidated. This means someone' +
							' intercepted one of your API tokens through your internet traffic. ' +
							'Take this very seriously.', PaperToast.DURATION.LONG);
					} else {
						PaperToast.createHidable('Invalid credentials for extending API token, ' +
							'it will time out in 3 minutes');
					}
					break;
				case API_ERRS.INVALID_PARAM_TYPES:
				case API_ERRS.MISSING_PARAMS:
				case API_ERRS.NO_REQUEST_BODY:
					PaperToast.createHidable('Failed to send API token extension request, ' +
						'it will time out in 3 minutes', PaperToast.DURATION.LONG);
					break;
				case API_ERRS.SERVER_ERROR:
					PaperToast.createHidable('A server error occurred when sending API token' +
						' extension request, it will time out in 3 minutes', 
						PaperToast.DURATION.LONG);
					break;
				case API_ERRS.TOO_MANY_REQUESTS:
					PaperToast.createHidable('The server responded with "too many requests"' +
						' when sending API token extension request,' +
						' it will time out in 3 minutes', PaperToast.DURATION.LONG);
					break;
			}
		}
	}

	getAPIToken(): APIToken {
		return this._token!;
	}

	protected abstract _loadEntrypoint(page: ENTRYPOINT): void;

	protected _getEntrypointValue(entrypoint: ENTRYPOINT) {
		switch (entrypoint) {
			case ENTRYPOINT.LOGIN:
				return 'login';
			case ENTRYPOINT.DASHBOARD:
				return 'dashboard';
		}
	}

	private _addNewPage(page: ENTRYPOINT): EntrypointPage {
		const newEl = document.createElement(`${this._getEntrypointValue(page)}-page`);
		newEl.classList.add('hidden', 'newpage', 'invisible');

		this.$.content.appendChild(newEl);
		return newEl as EntrypointPage;
	}

	private _hideNonCurrent() {
		//Remove everything that is not the current page first
		const currentContent = this.currentContent;
		this.content.filter((node) => {
			return node !== currentContent;
		}).forEach((node) => {
			node.remove();
		});
	}

	private _setTitle(title: string) {
		try {
			document.getElementsByTagName('title')[0].innerHTML = title
				.replace('<','&lt;')
				.replace('>','&gt;')
				.replace(' & ',' &amp; ');
		}
		catch ( e ) {
			document.title = title;
		}
	}

	async changePage(page: ENTRYPOINT, replace: boolean = false) {
		if (this.props.page === page) {
			return;
		}

		this._hideNonCurrent();
		this._loadEntrypoint(page);
		const el = this._addNewPage(page);
		this.$.loadable.load();
		await wait(500);
		await Promise.all([
			awaitMounted(el),
			wait(ANIMATE_TIME)
		]);
		this.props.page = page;
		this.setGlobalProperty('page', page);
		this._hideNonCurrent();
		el.classList.remove('invisible', 'hidden');
		this.$.loadable.finish();

		if (replace) {
			window.history.replaceState({
				page: page
			}, GlobalController._entrypointTitles[page],
				GlobalController._entrypointURLs[page]);
			this._setTitle(GlobalController._entrypointTitles[page]);
		} else {
			window.history.pushState({
				page: page
			}, GlobalController._entrypointTitles[page],
				GlobalController._entrypointURLs[page]);
			this._setTitle(GlobalController._entrypointTitles[page]);
		}
	}

	find<T extends keyof WebComponentElementsByTag>(tagName: T): WebComponentElementsByTag[T]|null {
		const maps = this.runGlobalFunction((element) => {
			return {
				tagName: element.config.is,
				element
			}
		});
		for (const { element, tagName: elementTagName } of maps) {
			if (tagName === elementTagName) {
				return element as any;
			}
		}
		return null;
	}
	
	mounted() {
		this.props.page = this.getGlobalProperty('page')!;
		this.listen('globalPropChange', (key, val) => {
			if (key === 'page') {
				this.props.page = val as ENTRYPOINT;
			}
		});
		this._handleInitialState();
	}
}