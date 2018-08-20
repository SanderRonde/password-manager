/// <reference path="../../../types/elements.d.ts" />
import { defineProps, PROP_TYPE, config } from '../../../lib/webcomponent-util';
import { ConfigurableWebComponent } from '../../../lib/webcomponents';
import { GlobalControllerIDMap } from './global-controller-querymap';
import { GlobalControllerHTML } from './global-controller.html';
import { Dashboard } from '../base/dashboard/dashboard';
import { Login } from '../base/login/login';

interface GlobalControllerData {
	loginData: {
		password: string;
		login_auth: string;
		instance_id: string;
		server_public_key: string;
	}
}

@config({
	is: 'global-controller',
	css: null,
	html: GlobalControllerHTML
})
export abstract class GlobalController extends ConfigurableWebComponent<GlobalControllerIDMap> {
	private _data: Map<keyof GlobalControllerData, GlobalControllerData[keyof GlobalControllerData]> =
		new Map();
	props = defineProps(this, {
		reflect: {
			page: {
				type: PROP_TYPE.STRING,
				exactType: '' as 'login'|'dashboard'
			}
		}
	});

	get content() {
		return this.$.content.assignedNodes()
			.filter((node) => {
				//HTMLElement.ELEMENT_NODE = 1
				return node.nodeType === 1;
			}) as HTMLElement[];
	}

	get currentContent(): Login|Dashboard|null {
		const content = this.content;
		for (const node of content) {
			if ((node.tagName.toLowerCase() === 'login-page' &&
				this.props.page === 'login') || (
					node.tagName.toLowerCase() === 'dashboard-page' &&
					this.props.page === 'dashboard')) {
						return node as Login|Dashboard;
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
}