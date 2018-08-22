import { config, defineProps, PROP_TYPE, JSONType } from '../../../lib/webcomponent-util';
import { ConfigurableWebComponent } from '../../../lib/webcomponents';
import { InfiniteListIDMap } from './infinite-list-querymap';
import { InfiniteListHTML } from './infinite-list.html';
import { InfiniteListCSS } from './infinite-list.css';
import { TemplateResult, html } from 'lit-html';

@config({
	is: 'infinite-list',
	css: InfiniteListCSS,
	html: InfiniteListHTML
})
export class InfiniteList<D> extends ConfigurableWebComponent<InfiniteListIDMap> {
	public htmlTemplate: (data: D) => TemplateResult = () => html``;
	props = defineProps(this, {
		reflect: {
			dataName: {
				type: PROP_TYPE.STRING,
				defaultValue: 'item'
			},
			data: {
				type: JSONType<D[]>(),
				defaultValue: [],
				isPrivate: true
			}
		}
	});

	private static _strToPath(str: string) {
		const path: (string|number)[] = [];
		
		let pushCurrentItem: boolean = false;
		let currentPathItem: string = '';
		for (const char of str) {
			if (char === '.' || char === '[') {
				pushCurrentItem = true;
			} else if (char !== ']') {
				currentPathItem += char;
			}

			if (pushCurrentItem) {
				path.push(currentPathItem);
				currentPathItem = '';
				pushCurrentItem = false;
			}
		}
		path.push(currentPathItem);

		return path.filter(item => item !== '');
	}

	private _evaluateDataPath(data: D, path: (string|number)[]): string {
		let current: D|{} = data;
		for (const part of path) {
			current = current[part as keyof typeof current];
		}
		if (Array.isArray(current)) {
			return current.join(',');
		}
		return current.toString();
	}

	private _genTemplateGetter() {
		const srcNode = this.$.template.assignedNodes().filter((node) => {
			//1 = HTMLElement
			return node.nodeType === 1;
		})[0] as HTMLElement;
		if (!srcNode) {
			return;
		}
		const split = srcNode.innerHTML.split(`="${this.props.dataName}`);
		const values = split.map((part, index) => {
			if (index === 0) return null;
			return part.slice(0, part.indexOf('"'));
		}).filter(value => value !== null) as string[];
		const strings = split.map((part, index, arr) => {
			if (index === 0) {
				return `${part}="`;
			} else if (index === arr.length - 1) {
				return part.slice(part.indexOf('"'));
			}
			return `${part.slice(part.indexOf('"'))}="`
		});

		const dataPaths = values.map(InfiniteList._strToPath);
		const templateString: any = strings;
		templateString.raw = strings;
		this.htmlTemplate = (data: D) => {
			return html(templateString as TemplateStringsArray,
				...dataPaths.map((dataPath) => {
					return this._evaluateDataPath(data, dataPath);
				}));
		}
	}

	mounted() {
		this._genTemplateGetter();
		this.renderToDOM();
	}
}