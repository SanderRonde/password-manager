import { defineProps, PROP_TYPE, config, wait, awaitMounted } from '../../../lib/webcomponent-util';
import { StringifiedObjectId, EncryptedInstance } from '../../../types/db-types';
import { ANIMATE_TIME } from '../../util/loadable-block/loadable-block.css';
import { LoadableBlock } from '../../util/loadable-block/loadable-block';
import { ConfigurableWebComponent } from '../../../lib/webcomponents';
import { GlobalControllerIDMap } from './global-controller-querymap';
import { GlobalControllerHTML } from './global-controller.html';
import { GlobalControllerCSS } from './global-controller.css';
import { Dashboard } from '../base/dashboard/dashboard';
import { ENTRYPOINT } from '../../../types/shared-types';
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
	private _data: Map<keyof GlobalControllerData, GlobalControllerData[keyof GlobalControllerData]> =
		new Map();
	props = defineProps(this, {
		reflect: {
			page: {
				type: PROP_TYPE.STRING,
				exactType: '' as ENTRYPOINT
			}
		}
	});

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

	async changePage(page: ENTRYPOINT) {
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
	}
	
	mounted() {
		this.props.page = this._globalProperties.page!;
		this.listen('globalPropChange', (key, val) => {
			if (key === 'page') {
				this.props.page = val as ENTRYPOINT;
			}
		});
	}
}