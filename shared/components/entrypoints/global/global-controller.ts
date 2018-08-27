import { defineProps, PROP_TYPE, config, wait, awaitMounted } from '../../../lib/webcomponent-util';
import { StringifiedObjectId, EncryptedInstance } from '../../../types/db-types';
import { ANIMATE_TIME } from '../../util/loadable-block/loadable-block.css';
import { LoadableBlock } from '../../util/loadable-block/loadable-block';
import { ConfigurableWebComponent } from '../../../lib/webcomponents';
import { GlobalControllerIDMap } from './global-controller-querymap';
import { GlobalControllerHTML } from './global-controller.html';
import { GlobalControllerCSS } from './global-controller.css';
import { ENTRYPOINT } from '../../../types/shared-types';
import { Dashboard } from '../base/dashboard/dashboard';
import { Login } from '../base/login/login';

export interface GlobalControllerData {
	loginData: {
		password: string;
		login_auth: string;
		instance_id: StringifiedObjectId<EncryptedInstance>;
		private_key: string;
		server_public_key: string;
	}
}

type EntrypointPage = Login|Dashboard;

function getEntrypointValue(entrypoint: ENTRYPOINT) {
	switch (entrypoint) {
		case ENTRYPOINT.LOGIN:
			return 'login';
		case ENTRYPOINT.DASHBOARD:
			return 'dashboard';
	}
}

@config({
	is: 'global-controller',
	css: GlobalControllerCSS,
	html: GlobalControllerHTML,
	dependencies: [
		LoadableBlock
	]
})
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
	props = defineProps(this, {
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

	private _definePage(page: ENTRYPOINT) {
		const entrypoint = getEntrypointValue(page);
		if (customElements.get(`${entrypoint}-page`)) {
			return;
		}
		const src = `/entrypoints/${entrypoint}/${entrypoint}-page.js`;
		const script = document.createElement('script');
		if (document.body.classList.contains('dev')) {
			script.type = 'module';
		}
		script.src = src;
		document.body.appendChild(script);
	}

	private _addNewPage(page: ENTRYPOINT): EntrypointPage {
		const newEl = document.createElement(`${getEntrypointValue(page)}-page`);
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
		this._definePage(page);
		const el = this._addNewPage(page);
		this.$.loadable.load();
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
	
	mounted() {
		this.props.page = this._globalProperties.page!;
		this.listen('globalPropChange', (key, val) => {
			if (key === 'page') {
				this.props.page = val as ENTRYPOINT;
			}
		});
		this._handleInitialState();
	}
}