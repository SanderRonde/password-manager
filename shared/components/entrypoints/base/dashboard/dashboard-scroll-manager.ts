import { createDisposableWindowListener } from '../../../../lib/webcomponent-util';
import { ConfigurableWebComponent } from '../../../../lib/webcomponents';
import { PW_VIEW_SCROLL, TITLE_BAR_HEIGHT } from './dashboard.css';
import { bindToClass } from '../../../../lib/decorators';
import { DashboardIDMap } from './dashboard-querymap';
import { isNewElement } from "../../../../lib/listeners";

const MAX_DOC_SCROLL = PW_VIEW_SCROLL - TITLE_BAR_HEIGHT;

export abstract class DashboardScrollManager extends ConfigurableWebComponent<DashboardIDMap> {
	private get _intersectionObserverSupported() {
		return 'IntersectionObserver' in window;
	}

	@bindToClass
	private _listIntersect() {
		this._scroll();
	}

	private _observed: {
		detailView: HTMLElement;
		list: HTMLElement;
	}|null = null;
	private _observers = this._intersectionObserverSupported ? {
		list: new IntersectionObserver(this._listIntersect, {
			root: null,
			rootMargin: `-${PW_VIEW_SCROLL}px 0px 0px 0px`
		})
	 } : null;

	private _currentAnimationFrame: number|null = null;
	private _passwordFocusIsFixed: boolean = false;
	private _scroll() {
		if (this._passwordFocusIsFixed || document.documentElement!.scrollTop <= MAX_DOC_SCROLL) {
			this._passwordFocusIsFixed = false;
			this.$.passwordDetail.classList.remove('fixed');
		} else if (!this._passwordFocusIsFixed && 
			this.$.passwordFocus.getBoundingClientRect().top <= PW_VIEW_SCROLL) {
				this._passwordFocusIsFixed = true;
				this.$.passwordDetail.classList.add('fixed');
			}
	}

	mounted() {
		super.mounted();
		if (!this._intersectionObserverSupported) {
			this.disposables.push(createDisposableWindowListener('scroll', () => {
				if (this._currentAnimationFrame) return;
				this._currentAnimationFrame = window.requestAnimationFrame(() => {
					this._currentAnimationFrame = null;
					this._scroll();
				});
			}, {
				passive: true
			}));
		}

		this._passwordFocusIsFixed = this.$.passwordFocus.getBoundingClientRect().top < 0;
		this._scroll();
	}

	postRender() {
		if (isNewElement(this.$.passwordTop)) {
			if (this._intersectionObserverSupported) {
				if (this._observed && this._observed.list) {
					this._observers!.list.unobserve(this._observed.list);
				}
				this._observers!.list.observe(this.$.passwordTop);
				this._observed = this._observed || {} as Partial<{
					detailView: HTMLElement;
					list: HTMLElement;
				}> as {
					detailView: HTMLElement;
					list: HTMLElement;
				};
				this._observed.list = this.$.passwordTop;
			}
		}
	}
}