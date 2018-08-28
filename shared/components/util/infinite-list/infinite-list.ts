import { config, defineProps, PROP_TYPE, JSONType, createNumberList, any, listenWithIdentifier, isNewElement, listen, wait, listenIfNew } from '../../../lib/webcomponent-util';
import { ConfigurableWebComponent } from '../../../lib/webcomponents';
import { InfiniteListIDMap } from './infinite-list-querymap';
import { TemplateResult, html, render } from 'lit-html';
import { InfiniteListHTML } from './infinite-list.html';
import { InfiniteListCSS } from './infinite-list.css';
import { bindToClass } from '../../../lib/decorators';

export type ListItemContainer<D, ID> = HTMLDivElement & {
	host: InfiniteList<D, ID>
};

@config({
	is: 'infinite-list',
	css: InfiniteListCSS,
	html: InfiniteListHTML
})
export class InfiniteList<D, ID> extends ConfigurableWebComponent<InfiniteListIDMap> {
	private _htmlTemplate: (data: D, itemData: ID|null) => TemplateResult = () => html``;
	private _usedViewportHeight: number|null = null;
	private _usedData: D[]|null = null;
	private _itemData: (ID|null)[]|null = null;
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
	public itemSize: number|null = null;

	private static _strToPath(str: string) {
		const isData = str.startsWith('_data');
		if (isData) {
			str = str.slice('_data'.length);
		}
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

		return {
			isData: isData,
			path: path.filter(item => item !== '')
		}
	}

	private _evaluateDataPath(data: D, itemData: ID, { isData, path }: {
		isData: boolean;
		path: (string|number)[]
	}): string {
		try {
			let current: D|ID|{} = isData ? itemData : data;
			for (const part of path) {
				if (current === undefined || current === null) {
					return '';
				}
				current = current[part as keyof typeof current];
			}
			if (Array.isArray(current)) {
				return current.join(',');
			}
			return current.toString();
		} catch(e) {
			return '';
		}
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
		const strings = split.length === 1 ? split : split.map((part, index, arr) => {
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
		this._htmlTemplate = (data: D, itemData: ID) => {
			return html(templateString as TemplateStringsArray,
				...dataPaths.map((dataPath) => {
					return this._evaluateDataPath(data, 
						itemData, dataPath);
				}));
		}
	}

	private async _setListItemSize() {
		if (this.itemSize || !this.$.sizeGetter ||
			!(0 in this.props.data)) {
				return;
			}

		this.$.sizeGetter.classList.remove('hidden');
		render(this._htmlTemplate(this.props.data[0], null), 
			this.$.sizeGetter);
		this.itemSize = this.$.sizeGetter.getBoundingClientRect().height;
		this.$.sizeGetter.classList.add('hidden');
		if (this.itemSize !== 0) {
			this._setContainerSize();
			this.renderToDOM();
		}
	}

	private get _itemsPerViewport() {
		const viewport = this.getBoundingClientRect().height;
		this._usedViewportHeight = viewport;
		return Math.ceil((viewport / this.itemSize!) * 3) + 1;
	}

	private get _scrolled() {
		return this.$.contentContainer.scrollTop;
	}

	private _selectedItem: {
		virtual: number;
		physical: number;
		element: HTMLElement;
	}|null = null;

	private _containers: {
		element: HTMLElement;
		virtual: number|null;
		physical: number;
	}[] = [];
	private _createContainers() {
		//Calculate the amount of containers
		const containers = this._itemsPerViewport;
		this._containers = Array(containers).fill('').map((_, index) => {
			const el = document.createElement('div');
			el.tabIndex = -1;
			el.classList.add('container');
			this.$.physicalContent.appendChild(el);
			return {
				element: el,
				virtual: null,
				physical: index
			};
		});
		this._containers.forEach((container, index) => {
			const el = container.element as ListItemContainer<D, ID>;
			el.host = this;
			
			listenWithIdentifier(this, container.element,
				`__infiniteListContainer${index}`, 'focus', () => {
					this._selectedItem = {...this._containers[index]} as {
						virtual: number;
						physical: number;
						element: HTMLElement;
					};
					container.element.classList.add('focused');
				});
			listenWithIdentifier(this, container.element,
				`__infiniteListContainer${index}`, 'blur', () => {
					if (this._selectedItem && this._selectedItem.physical === index &&
						!this._dontBlur) {
							this._selectedItem = null;
						}
					container.element.classList.remove('focused');
				});
		});
	}

	private _getVisibleVirtual() {
		const scrolled = this._scrolled;
		
		//Render about a viewport above and a viewport below
		const topScrolled = scrolled - this._usedViewportHeight!;
		const bottomScrolled = scrolled + this._usedViewportHeight!;

		const firstElementIndex = Math.max(0, 
			Math.floor(topScrolled / this.itemSize!));
		const lastElementIndex = Math.min(this.props.data.length,
			Math.ceil(bottomScrolled / this.itemSize!));
		return createNumberList(firstElementIndex, lastElementIndex);
	}

	private _isRendered(virtual: number) {
		return any(this._containers.map((container) => {
			return container.virtual === virtual;
		})) !== false;
	}

	private _getFreeItem(toRender: number[]) {
		//First try to get an already free item
		for (const { virtual, physical } of this._containers) {
			if (virtual === null) {
				return physical;
			}
		}

		//Try to get something not in the to-render list
		for (const { virtual, physical } of this._containers) {
			if (any(toRender.map((toRenderItem) => {
				return toRenderItem === virtual;
			})) === false) {
				return physical;
			}
		};

		//Try to get something below or above the current list
		let currentTotal: number = 0;
		for (const { virtual } of this._containers) {
			currentTotal += virtual!;
		}

		let newTotal: number = 0;
		for (const virtual of toRender) {
			currentTotal += virtual!;
		}

		if ((currentTotal / this._containers.length) > 
			(newTotal / toRender.length)) {
				//Previous avg was bigger, meaning the average lies lower,
				// meaning the user is scrolling up
				// free the last item
				return this._containers.length - 1;
			} else {
				//Return first item
				return 0;
			}
	}

	private _dontBlur: boolean = false;
	private _freeItem(physicalIndex: number) {
		if (this._selectedItem) {
			if (this._containers[physicalIndex].virtual === this._selectedItem.virtual) {
				//Move focus to a different element
				this._dontBlur = true;
				this.$.focusCapturer.focus();
				this._dontBlur = false;
			}
		}
		this._containers[physicalIndex].element.blur();
		this._containers[physicalIndex].element.classList.remove('focused');
	}

	private _renderItem(virtual: number, toRender: {
		virtual: number;
		render: boolean;
	}[]) {
		const freePhysical = this._getFreeItem(toRender.map(({ virtual }) => virtual));
		this._freeItem(freePhysical);

		this._containers[freePhysical].virtual = virtual;
		render(this._htmlTemplate(this.props.data[virtual],
			this._itemData![virtual]), this._containers[freePhysical].element);
		this._containers[freePhysical].element.style.transform = 
			`translateY(${virtual * this.itemSize!}px)`;
	}

	@bindToClass
	private _render(force: boolean) {
		if (!this.itemSize) {
			return;
		}

		if (this._containers.length === 0 || force) {
			this._createContainers();
		}

		const visible = this._getVisibleVirtual().map((num) => {
			return {
				virtual: num,
				render: true
			}
		});
		for (const { render, virtual } of visible) {
			if (!render) return;
			if (!this._isRendered(virtual)) {
				this._renderItem(virtual, visible);
			}
		}
	}

	private _startRender() {
		if (this.props.data !== this._usedData) {
			this._usedData = this.props.data;
			this._itemData = this.props.data.map(_ => null);
			this._setContainerSize();
			this._render(true);
			return;
		}
		this._render(false);
	}

	public setItemData(index: number, data: ID) {
		//Don't re-render, just assume the component has updated it itself
		this._itemData![index] = data;
	}

	private _setContainerSize() {
		if (!this.itemSize) {
			return;
		}
		this.$.physicalContent.style.height = (this.props.data.length *
			this.itemSize!) + 'px';
	}
	
	private _setSelectedItem(virtual: number, element: HTMLElement) {
		this._selectedItem = {...this._containers[any(
			this._containers.map((container) => {
				return container.virtual === virtual;
			})) as number]} as {
				virtual: number;
				physical: number;
				element: HTMLElement;
			};
		this._selectedItem.element.focus();
		element.classList.remove('focused');
		this._selectedItem.element.classList.add('focused');
	}

	postRender() {
		this._setListItemSize();
		listenIfNew(this, 'focusCapturer', 'keydown', async (e) => {
			const { virtual, element } = this._selectedItem!;

			let newVirtual = 0;
			if (e.keyCode === 38) { //Arrow up
				newVirtual = Math.max(0, virtual! - 1);
			} else if (e.keyCode === 40) { //Arrow down
				newVirtual = Math.min(this.props.data.length,
					virtual! + 1);
			}

			//Scroll into view
			if (this._containers[Math.floor(this._containers.length / 2)].virtual! >= newVirtual) {
				//It's before the current one, scroll up
				this.$.contentContainer.scrollTop = newVirtual * this.itemSize!;
			} else {
				//Scroll down
				this.$.contentContainer.scrollTop = this._usedViewportHeight! +
					((newVirtual - 1) * this.itemSize!);
			}

			await wait(50);
			this._setSelectedItem(newVirtual, element);
		});
		if (isNewElement(this.$.contentContainer)) {
			this._setContainerSize();
			listen(this, 'contentContainer', 'scroll', () => {
				requestAnimationFrame(() => {
					this._render(false);
				});
			});
			listen(this, 'contentContainer', 'keypress', async (e) => {
				if (!this._selectedItem) {
					return;
				}

				const { virtual, element } = this._selectedItem;

				let newVirtual = 0;
				if (e.keyCode === 38) { //Arrow up
					newVirtual = Math.max(0, virtual! - 1);
				} else if (e.keyCode === 40) { //Arrow down
					newVirtual = Math.min(this.props.data.length,
						virtual! + 1);
				}

				this._setSelectedItem(newVirtual, element);
			});
		}
		this._startRender();
	}

	@bindToClass
	private _onWindowResize() {
		if (this._usedViewportHeight !== this.getBoundingClientRect().height) {
			this._render(true);
		}
	}

	async mounted() {
		this._genTemplateGetter();
		this.renderToDOM();
		this._disposables.push(
			createDisposableWindowListener('resize', this._onWindowResize));
	}
}