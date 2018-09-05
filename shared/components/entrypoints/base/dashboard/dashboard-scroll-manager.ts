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

	private _detailViewWasScrolledUp: boolean = false;
	private _isInitialDetailViewIntersectCall: boolean = true;
	@bindToClass
	private _detailViewIntersect() {
		if (this._isInitialDetailViewIntersectCall) {
			this._isInitialDetailViewIntersectCall = false;
			return;
		}
		const isScrolledUp = !this._detailViewWasScrolledUp;
		this._detailViewWasScrolledUp = isScrolledUp;

		if (isScrolledUp) {
			this._passwordFocusIsFixed = true;
			this.$.passwordDetail.classList.add('fixed');
		}
	}
	
	@bindToClass
	private _listIntersect(entries: IntersectionObserverEntry[]) {
		if (entries[0].intersectionRatio) {
			this._passwordFocusIsFixed = false;
			this.$.passwordDetail.classList.remove('fixed');
		}
	}

	private _observed: {
		detailView: HTMLElement;
		list: HTMLElement;
	}|null = null;
	private _observers = this._intersectionObserverSupported ? {
		detailView: new IntersectionObserver(this._detailViewIntersect, {
			root: null,
			rootMargin: `-${PW_VIEW_SCROLL}px 0px 0px 0px`
		}),
		list: new IntersectionObserver(this._listIntersect, {
			root: null,
			rootMargin: `-${PW_VIEW_SCROLL}px 0px 0px 0px`
		})
	 } : null;

	private _currentAnimationFrame: number|null = null;
	private _passwordFocusIsFixed: boolean = false;
	private _scroll() {
		if (this._passwordFocusIsFixed && document.documentElement.scrollTop <= MAX_DOC_SCROLL) {
			this._passwordFocusIsFixed = false;
			this.$.passwordDetail.classList.remove('fixed');
		} else if (!this._passwordFocusIsFixed && 
			this.$.passwordFocus.getBoundingClientRect().top <= PW_VIEW_SCROLL) {
				this._passwordFocusIsFixed = true;
				this.$.passwordDetail.classList.add('fixed');
			}
	}

	mounted() {
		if (!this._intersectionObserverSupported) {
			this._disposables.push(createDisposableWindowListener('scroll', () => {
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
		if (isNewElement(this.$.passwordDetailTop)) {
			this._detailViewWasScrolledUp = this.$.passwordDetailTop.getBoundingClientRect().top < 0;
			if (this._intersectionObserverSupported) {
				if (this._observed && this._observed.detailView) {
					this._observers!.detailView.unobserve(this._observed.detailView);
				}
				this._observers!.detailView.observe(this.$.passwordDetailTop);
				this._observed = this._observed || {} as Partial<{
					detailView: HTMLElement;
					list: HTMLElement;
				}> as {
					detailView: HTMLElement;
					list: HTMLElement;
				};
				this._observed.detailView = this.$.passwordDetailTop;
			}
		}
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