import { config, defineProps, PROP_TYPE, ComplexType, createNumberList, any, listenWithIdentifier, isNewElement, listen, wait, createDisposableWindowListener } from '../../../lib/webcomponent-util';
import { ConfigurableWebComponent } from '../../../lib/webcomponents';
import { InfiniteListIDMap } from './infinite-list-querymap';
import { TemplateResult, html, render } from 'lit-html';
import { InfiniteListHTML } from './infinite-list.html';
import { InfiniteListCSS } from './infinite-list.css';
import { bindToClass } from '../../../lib/decorators';

export type ListItemContainer<D, ID, P> = HTMLDivElement & {
	host: InfiniteList<D, ID, P>
};

type TemplateValue<D, ID> = {
	type: "preset";
	fn: (data: D, itemData: ID, index: number, isTemplate: boolean) => any;
}|{
	type: "path";
	isData: boolean;
	path: (string | number)[];
}

@config({
	is: 'infinite-list',
	css: InfiniteListCSS,
	html: InfiniteListHTML
})
export class InfiniteList<D, ID, P> extends ConfigurableWebComponent<InfiniteListIDMap> {
	private _htmlTemplate: (data: D, itemData: ID|null, index: number, isTemplate: boolean) => TemplateResult = () => html``;
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
				type: ComplexType<D[]>(),
				defaultValue: [],
				isPrivate: true
			},
			defaultItemData: {
				type: ComplexType<Partial<ID>>(),
				defaultValue: null,
				isPrivate: true
			},
			window: PROP_TYPE.BOOL,
			itemSize: ComplexType<(data: D, special: {
				isMin: boolean;
			}) => number>(),
			ref: {
				type: ComplexType<P>()
			}
		}
	});
	private _inferredItemSize: number = 0;
	private __itemSizes: number[]|null = null;

	public get parent(): P {
		return this.props.ref;
	}

	public get rendered(): HTMLElement[] {
		return this._containers.filter((container) => {
			return container.virtual !== null;
		}).map((container) => {
			return container.element.children[0];
		}) as HTMLElement[];
	}

	private _canGetItemSize() {
		if (this.props.itemSize) {
			if (!this._itemSizes) {
				if (!this.props.data) {
					return false;
				}
			}
			return true;
		}
		return !!this._inferredItemSize;
	}

	private get _itemSizes() {
		this._genItemSizeArrs();
		return this.__itemSizes;
	}

	private __minSize: number|null = null;
	private get _minSize() {
		if (this.__minSize !== null) {
			return this.__minSize;
		}
		if (this.props.itemSize) {
			let min = (this.__minSize = this.props.itemSize({} as any, {
				isMin: true
			}));
			if (min === 0) {
				console.warn('Don\'t supply 0 as the minimum value as that results in infinite entries');
				min = 1;
			}
			return min;
		}
		return (this.__minSize = this._inferredItemSize);
	}	

	private __cumulativeItemSizes: number[]|null = null;
	private _genItemSizeArrs() {
		if ((this.__itemSizes && this.__itemSizes.length === this.props.data.length) 
			|| !this.props.data || !this.props.itemSize) {
				return;
			}
		this.__itemSizes = this.props.data.map((data) => {
			return this.props.itemSize(data, {
				isMin: false
			});
		});

		let offset: number = 0;
		this.__cumulativeItemSizes = [];
		for (const item of this.__itemSizes) {
			this.__cumulativeItemSizes!.push(offset);
			
			offset += item;
		}
	}

	private get _cumulativeItemSizes() {
		this._genItemSizeArrs();
		return this.__cumulativeItemSizes;
	}

	private static _strToPath(str: string): TemplateValue<any, any> {
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
			type: 'path',
			isData: isData,
			path: path.filter(item => item !== '')
		}
	}

	private _evaluateDataPath(data: D, itemData: ID, { isData, path }: {
		isData: boolean;
		path: (string|number)[]
	}): any {
		try {
			let current: D|ID|{} = isData ? itemData : data;
			for (const part of path) {
				if (current === undefined || current === null) {
					return '';
				}
				current = current[part as keyof typeof current];
			}
			return current;
		} catch(e) {
			return '';
		}
	}

	private _extractStringValue(str: string, value: string,
		valueGetter: (data: D, itemData: ID, index: number, isTemplate: boolean) => any): {
			strings: string[];
			values: TemplateValue<D, ID>[];
		} {
			const split = str.split(`="${value}"`);
			const originalValues = split.map((splitStr, index, arr) => {
				if (arr.length === 1) {
					return splitStr;
				}
				if (index === 0) {
					return `${splitStr}="`;
				}
				if (index === arr.length - 1) {
					return `"${splitStr}`
				}
				return `"${splitStr}="`;
			});

			return {
				strings: originalValues,
				values: new Array(originalValues.length - 1).fill('').map((_ => ({
					type: 'preset' as 'preset',
					fn: valueGetter
				})))
			}
		}

	private _splitDataValue(str: string) {
		const split = str.split(`="${this.props.dataName}`);
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
		return {
			strings,
			values: dataPaths
		}
	}

	private _applyExtractorRound(initialStrings: string[], initialValues: TemplateValue<D, ID>[],
		extractor: (str: string) => {
			strings: string[];
			values: TemplateValue<D, ID>[];
		}): {
			strings: string[];
			values: TemplateValue<D, ID>[];
		} {
			const newStrings: string[] = [];
			const newValues: TemplateValue<D, ID>[] = [];
			for (let i = 0; i < initialStrings.length; i++) {
				const str = initialStrings[i];
				const { strings, values } = extractor(str);

				for (let j = 0 ; j < strings.length; j++) {
					newStrings.push(strings[j]);
					if (j !== strings.length - 1) {
						newValues.push(values[j]);
					}
				}
				if (i !== initialStrings.length - 1) {
					newValues.push(initialValues[i]);
				}
			}
			return {
				strings: newStrings,
				values: newValues
			}
		}

	private _joinTemplateExtractors(strings: string[], ...extractors: ((str: string) => {
		strings: string[];
		values: TemplateValue<D, ID>[];
	})[]): {
		strings: string[];
		values: TemplateValue<D, ID>[];
	} {
		let values: TemplateValue<D, ID>[] = [];
		for (const extractor of extractors) {
			const { 
				strings: newStrings, 
				values: newValues
			} = this._applyExtractorRound(strings, values, extractor);
			strings = newStrings;
			values = newValues;
		}
		return {
			strings, values
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

		const { strings, values } = this._joinTemplateExtractors([srcNode.innerHTML],
			(str) => {
				return this._extractStringValue(str, '_this', () => {
					return this;
				});
			},
			(str) => {
				return this._extractStringValue(str, '_index', (_d, _i, index) => {
					return index;
				});
			}, (str) => {
				return this._extractStringValue(str, '_is-template', 
					(_d, _i, __i, isTemplate) => {
						return isTemplate;
				});
			}, (str) => {
				return this._splitDataValue(str);
			});

		const templateString: any = strings;
		templateString.raw = [...strings];
		this._htmlTemplate = (data: D, itemData: ID, index: number, isTemplate: boolean) => {
			const args = values.map((value) => {
				if (value.type === 'path') {
					return this._evaluateDataPath(data, 
						itemData, value);	
				} else {
					return value.fn(data, itemData, index, isTemplate);
				}
			});
			console.log('Rendering with args', args);
			return this.complexHTML(templateString as TemplateStringsArray,
				...args);
		}
	}

	private async _setListItemSize() {
		if (this._inferredItemSize || !this.$.sizeGetter ||
			!this.props.data ||
			!(0 in this.props.data)) {
				return;
			}

		if (this.props.itemSize) {
			if (this._canGetItemSize()) {
				this._setContainerSize();
				this._inferredItemSize = 1;
				this.renderToDOM();
			}
			return;
		}
		this.$.sizeGetter.classList.remove('hidden');
		render(this._htmlTemplate(this.props.data[0], null, 0, true), 
			this.$.sizeGetter);
		this._inferredItemSize = this.$.sizeGetter.getBoundingClientRect().height;
		this.$.sizeGetter.classList.add('hidden');
		if (this._inferredItemSize !== 0) {
			this._setContainerSize();
			this.renderToDOM();
		}
	}

	private _itemsPerViewport() {
		const viewport = this.getBoundingClientRect().height;
		this._usedViewportHeight = this.props.window ? window.innerHeight : viewport;
		return Math.ceil((this._usedViewportHeight / this._minSize) * 3) + 1;
	}

	private get _scrolled() {
		if (this.props.window) {
			return document.documentElement.scrollTop;
		} else {
			return this.$.contentContainer.scrollTop;
		}
	}

	private set _scrolled(value: number) {
		if (this.props.window) {
			document.documentElement.scrollTop = value;
		} else {
			this.$.contentContainer.scrollTop = value;
		}
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
		this._containers.map((container) => {
			container.element.remove();
		});

		const containers = this._itemsPerViewport();
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
			const el = container.element as ListItemContainer<D, ID, P>;
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

	private _getElementStartingAt(offset: number) {
		const list = this._itemSizes!;
		
		let total: number = 0;
		for (let i = 0; i < list.length; i++) {
			if (total >= offset) {
				return i;
			}
			total += list[i];
		}
		return list.length - 1;
	}

	private _getFillingItems(startOffset: number, maxOffset: number) {
		let offset = startOffset;
		let virtualIndex = Math.max(0, this._getElementStartingAt(startOffset));

		const rendered: number[] = [];
		while (offset < maxOffset && virtualIndex < this._itemSizes!.length) {
			rendered.push(virtualIndex);
			offset += this._itemSizes![virtualIndex];
			virtualIndex++;
		}
		return rendered;
	}

	private _getVisibleVirtual() {
		const scrolled = this._scrolled;
		
		//Render about a viewport above and a viewport below
		const topScrolled = Math.max(0, scrolled - this._usedViewportHeight!);
		const bottomScrolled = scrolled + this._usedViewportHeight!;

		if (!this.props.itemSize) {
			const firstElementIndex = Math.floor(topScrolled / this._inferredItemSize!);
			const lastElementIndex = Math.min(this.props.data.length,
				Math.ceil(bottomScrolled / this._inferredItemSize!));
			return createNumberList(firstElementIndex, lastElementIndex);
		}
		return this._getFillingItems(topScrolled, bottomScrolled);
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
		console.log('Rendering item into', this._containers[freePhysical].element,
			'with props', this.props.data[virtual], 'and itemdata',
			this._itemData![virtual]);
		render(this._htmlTemplate(this.props.data[virtual],
			this._itemData![virtual], virtual, false), this._containers[freePhysical].element);
		this._containers[freePhysical].element.style.transform = 
			`translateY(${this._getStartOffset(virtual)}px)`;
	}

	@bindToClass
	private _render(force: boolean) {
		if (!this._inferredItemSize) {
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

	private get _defaultItemData() {
		if (typeof this.props.defaultItemData === 'object') {
			if (!this.props.defaultItemData) {
				return this.props.defaultItemData;
			}
			if (Array.isArray(this.props.defaultItemData)) {
				return [...this.props.defaultItemData];
			}
			try {
				return {...this.props.defaultItemData as Object};
			} catch(e) {}
		}
		return this.props.defaultItemData;
	}

	private _startRender() {
		if (!this.props.data) {
			return;
		}
		if (this.props.data !== this._usedData) {
			this._usedData = this.props.data;
			this._itemData = this.props.data.map(_ => this._defaultItemData as ID);
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

	public getItemData(index: number): ID|null {
		return this._itemData![index];
	}

	public updateItemData(index: number, updated: Partial<ID>) {
		const prevData = this._itemData![index];
		if (typeof prevData !== 'object' || typeof updated !== 'object') {
			console.warn('Can\'t update non-object data (use set)');
			return;
		}
		this._itemData![index] = {
			...(prevData as Object || {}), ...updated as Object
		} as ID;
	}

	public mapData(fn: (data: ID|null) => ID|null) {
		if (!this._itemData) {
			return;
		}
		for (let i = 0; i < this._itemData.length; i++) {
			this._itemData[i] = fn(this._itemData[i]!);
		}
	}

	private _setContainerSize() {
		if (!this._canGetItemSize()) {
			return;
		}
		if (this.props.itemSize) {
			this.$.physicalContent.style.height = 
				(this._cumulativeItemSizes!.slice(-1)[0] +
					this._itemSizes!.slice(-1)[0]) + 'px';
		} else {
			this.$.physicalContent.style.height = (this.props.data.length *
				this._inferredItemSize!) + 'px';
		}
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

	private _getStartOffset(virtualIndex: number) {
		if (this.props.itemSize) {
			return this._cumulativeItemSizes![virtualIndex];
		}
		return this._inferredItemSize * virtualIndex;
	}

	@bindToClass
	public async focusCapturerKeydown(e: KeyboardEvent) {
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
			this._scrolled = this._getStartOffset(newVirtual);
		} else {
			//Scroll down
			this._scrolled = this._usedViewportHeight! +
				this._getStartOffset(newVirtual - 1);
		}

		await wait(50);
		this._setSelectedItem(newVirtual, element);
	}

	@bindToClass
	public contentContainerScroll() {
		requestAnimationFrame(() => {
			this._render(false);
		});
	}

	@bindToClass
	public async contentContainerKeyPress(e: KeyboardEvent) {
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
	}

	postRender() {
		this._setListItemSize();
		if (isNewElement(this.$.contentContainer)) {
			this._setContainerSize();
			if (!this.props.window) {
				listen(this, 'contentContainer', 'scroll', () => {
					this.contentContainerScroll();
				});
			}
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
		this._render(true);
		this._disposables.push(
			createDisposableWindowListener('resize', this._onWindowResize));
		if (this.props.window) {
			this._disposables.push(
				createDisposableWindowListener('scroll', () => {
					requestAnimationFrame(() => {
						this._render(false);
					});
				}));
		}
	}
}