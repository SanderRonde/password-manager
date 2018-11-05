import { WebComponentThemeManger } from './theme-manager';
import { TemplateResult, isDirective } from 'lit-html';
import { EventListenerObj } from './listener';
import { bindToClass } from '../decorators';
import { TemplateFn } from './base';

export const refPrefix = '___complex_ref';
type ComplexValue = TemplateFn|Function|Object;
export abstract class WebComponentTemplateManager<E extends EventListenerObj> extends WebComponentThemeManger<E> {
	private __reffed: ComplexValue[] = [];

	private __genRef(value: ComplexValue) {
		if (this.__reffed.indexOf(value) !== -1) {
			return `${refPrefix}${
				this.__reffed.indexOf(value)}`;
		}

		this.__reffed.push(value);
		const refIndex = this.__reffed.length - 1;
		return `${refPrefix}${refIndex}`;
	}

	@bindToClass
	public complexHTML(fn: (strings: TemplateStringsArray, ...values: any[]) => TemplateResult, 
		strings: TemplateStringsArray, ...values: any[]) {
			values = values.map((value) => {
				if (value instanceof TemplateFn) {
					return this.__genRef(value);
				}
				if (Array.isArray(value) && !(value[0] instanceof TemplateResult)) {
					return this.__genRef(value);
				}
				if (!Array.isArray(value) && typeof value === 'object' && 
					!(value instanceof TemplateResult)) {
						return this.__genRef(value);
					}
				if (typeof value === 'function' && !isDirective(value)) {
					return this.__genRef(value);
				}
				return value;
			});
			return fn(strings, ...values);
		}

	public getRef(ref: string) {
		if (typeof ref !== 'string') {
			return undefined;
		}
		const refNumber = ~~ref.split(refPrefix)[1];
		return this.__reffed[refNumber];
	}

	public getParentRef(ref: string) {
		const parent = this.__getParent<WebComponentTemplateManager<any>>();
		if (!parent) {
			console.warn('Could not find parent of', this, 
				'and because of that could not find ref with id', ref);
			return undefined;
		}
		return parent.getRef(ref);
	}
}