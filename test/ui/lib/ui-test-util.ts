/// <reference types="Cypress" />
import { Theme, VALID_THEMES_T } from "../../../shared/types/shared-types";
import { theme } from '../../../shared/components/theming/theme/theme';
import { WebComponent } from '../../../shared/lib/webcomponents';
import { COLOR_NAME_MAP } from "./ui-test-const";

export function chainFunctions(fns: (() => Cypress.Chainable<any>)[]) {
	let current: Cypress.Chainable<any> = fns[0]();
	for (let i = 1 ; i < fns.length; i++) {
		current = current.then(fns[i]);
	}
	return current;
}

export function iterateThemes(element: Cypress.Chainable<JQuery<WebComponent>>, 
	callback: (currentTheme: Theme, root: ShadowRoot, themeName: VALID_THEMES_T) => Cypress.Chainable<any>|Promise<Cypress.Chainable<any>>,
	waitTime: number = 0) {
		getOriginalElement(element, (srcEl) => {
			const keyNames = Object.getOwnPropertyNames(theme) as VALID_THEMES_T[];

			return chainFunctions(keyNames.map((themeName) => {
				return () => {
					srcEl.setGlobalProperty('theme', themeName)
					return cy.wait(waitTime).then(() => {
						const ret = callback(theme[themeName], srcEl.shadowRoot!, 
							themeName);
						if ('wait' in ret) {
							ret.wait(waitTime);
						} else {
							ret.then((chain) => {
								chain.wait(waitTime);
							})
						}
					});
				}
			}));
		});
	}

function getsRGB(num: number) {
	num = (num <= 0.03928) ? num / 12.92 : Math.pow(((num + 0.055) / 1.055), 2.4);
	return num;
}

function getL(color: ColorRepresentation) {
	return (0.2126 * getsRGB(color.r)) +
		(0.7152 * getsRGB(color.g)) +
		(0.0722 * getsRGB(color.b));
}

export function getContrast(color1: string, color2: string) {
	const c1 = getL(getColorRepresentation(color1));
	const c2 = getL(getColorRepresentation(color2));
	return (Math.max(c1, c2) + 0.05) / (Math.min(c1, c2) + 0.05);
}

interface ColorRepresentation {
	r: number;
	g: number;
	b: number;
	a: number;
}

const HEX_REGEX = /#([a-fA-F\d]{2})([a-fA-F\d]{2})([a-fA-F\d]{2})/;
const HEX_ALPHA_REGEX = /#([a-fA-F\d]{2})([a-fA-F\d]{2})([a-fA-F\d]{2})([a-fA-F\d]{2})/;
const RGB_REGEX = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\s*\)/;
const RGBA_REGEX = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d\.)?(\d+)\s*\)/;
const BLACK: ColorRepresentation = {
	r: 0,
	g: 0,
	b: 0,
	a: 100
};

export function getColorRepresentation(color: string): ColorRepresentation {
	if (color.startsWith('#') && HEX_ALPHA_REGEX.exec(color)) {
		const match = HEX_ALPHA_REGEX.exec(color);
		if (!match) return BLACK;

		const [ , a, r, g, b ] = match;
		return {
			r: parseInt(r, 16),
			g: parseInt(g, 16),
			b: parseInt(b, 16),
			a: parseInt(a, 16) / 256
		}
	} else if (color.startsWith('#')) {
		const match = HEX_REGEX.exec(color);
		if (!match) return BLACK;

		const [ , r, g, b ] = match;
		return {
			r: parseInt(r, 16),
			g: parseInt(g, 16),
			b: parseInt(b, 16),
			a: 100
		}
	} else if (color.startsWith('rgba')) {
		const match = RGBA_REGEX.exec(color);
		if (!match) return BLACK;

		const [ , r, g, b, preDot, postDot ] = match;
		return {
			r: parseInt(r, 10),
			g: parseInt(g, 10),
			b: parseInt(b, 10),
			a: preDot ? parseInt(postDot, 10) : 100
		}
	} else if (color.startsWith('rgb')) {
		const match = RGB_REGEX.exec(color);
		if (!match) return BLACK;

		const [ , r, g, b ] = match;
		return {
			r: parseInt(r, 10),
			g: parseInt(g, 10),
			b: parseInt(b, 10),
			a: 100
		}
	}
	const mapped = colorNameToHex(color);
	if (mapped.startsWith('#')) {
		return getColorRepresentation(mapped);
	}
	return BLACK;
}

function colorNameToHex(name: string): string {
	if (name in COLOR_NAME_MAP) {
		return COLOR_NAME_MAP[name as keyof typeof COLOR_NAME_MAP];
	}
	return name;
}

export function toRGB(color: string) {
	const { r, g, b, a } = getColorRepresentation(color);
	if (a === 100) {
		return `rgb(${r}, ${g}, ${b})`;
	} else {
		return `rgba(${r}, ${g}, ${b}, ${a / 100})`;
	}
}

export type GetFirstArg<T> = T extends (arg1: infer E, ...args: any[]) => void ? E : any;
export function listenForEvent<T extends WebComponent>(el: T, event: GetFirstArg<T['listen']>, activator: () => void) {
	let wasCalled: boolean = false;
	el.listen(event, () => {
		wasCalled = true;
		return null as any;
	});
	activator();
	expect(wasCalled, `listener for "${event}" was called`).to.be.true;
}

export function getOriginalElement<T extends HTMLElement>(selector: string|Cypress.Chainable<JQuery<T>>, callback: (el: T) => void) {
	if (typeof selector === 'string') {
		cy.get(selector).then((el: JQuery<T>) => {
			callback(el.get(0));
		});
	} else {
		selector.then((el: JQuery<T>) => {
			callback(el.get(0));
		});
	}
}