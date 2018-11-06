import { WebComponentTemplateManager, CUSTOM_CSS_PROP_NAME } from './template-manager';
import { CHANGE_TYPE, TemplateFn } from './base';
import { EventListenerObj } from './listener';

export abstract class WebComponentCustomCSSManager<E extends EventListenerObj> extends WebComponentTemplateManager<E> {
	private ___hasCustomCSS: boolean|null = null;
	private __noCustomCSS: TemplateFn = new TemplateFn(null, CHANGE_TYPE.NEVER);
	public abstract isMounted: boolean;

	constructor() {
		super();

		const originalSetAttr = this.setAttribute;
		this.setAttribute = (key: string, val: string) => {
			originalSetAttr.bind(this)(key, val);
			if (key === CUSTOM_CSS_PROP_NAME && this.isMounted) {
				this.renderToDOM(CHANGE_TYPE.ALWAYS);
			}
		}
	}

	protected __hasCustomCSS() {
		if (this.___hasCustomCSS !== null) {
			return this.___hasCustomCSS;
		}
		if (!this.hasAttribute(CUSTOM_CSS_PROP_NAME) ||
			!this.getParentRef(this.getAttribute(CUSTOM_CSS_PROP_NAME)!)) {
				//No custom CSS applies
				if (this.isMounted) {
					this.___hasCustomCSS = false;
				}
				return false;
			}

		return (this.___hasCustomCSS = true);
	}

	private __getCustomCSS() {
		if (!this.__hasCustomCSS()) {
			return this.__noCustomCSS;
		}

		return this.getParentRef(this.getAttribute(CUSTOM_CSS_PROP_NAME)!) as TemplateFn<any>
	}

	protected customCSS() {
		return this.__getCustomCSS();
	}
}