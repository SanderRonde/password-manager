/// <reference types="Cypress" />
import { Theme, VALID_THEMES_T } from "../../../shared/types/shared-types";
import { theme } from '../../../shared/components/theming/theme/theme';
import { WebComponent } from '../../../shared/lib/webcomponents';

export function chainFunctions(fns: (() => Cypress.Chainable<any>)[]) {
	let current: Cypress.Chainable<any> = fns[0]();
	for (let i = 1 ; i < fns.length; i++) {
		current = current.then(fns[i]);
	}
	return current;
}

export function iterateThemes(element: Cypress.Chainable<JQuery<WebComponent>>, 
	callback: (currentTheme: Theme, root: ShadowRoot, themeName: VALID_THEMES_T) => Cypress.Chainable<any>) {
		element.then((srcEl) => {
			const keyNames = Object.getOwnPropertyNames(theme) as VALID_THEMES_T[];

			return chainFunctions(keyNames.map((themeName) => {
				return () => {
					srcEl.get(0).setGlobalProperty('theme', themeName)
					return cy.wait(500).then(() => {
						callback(theme[themeName], srcEl.get(0).shadowRoot!, 
							themeName).wait(500);
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

const COLOR_NAME_MAP = {
	"aliceblue": "#f0f8ff",
	"antiquewhite": "#faebd7",
	"aqua": "#00ffff",
	"aquamarine": "#7fffd4",
	"azure": "#f0ffff",
	"beige": "#f5f5dc",
	"bisque": "#ffe4c4",
	"black": "#000000",
	"blanchedalmond": "#ffebcd",
	"blue": "#0000ff",
	"blueviolet": "#8a2be2",
	"brown": "#a52a2a",
	"burlywood": "#deb887",
	"cadetblue": "#5f9ea0",
	"chartreuse": "#7fff00",
	"chocolate": "#d2691e",
	"coral": "#ff7f50",
	"cornflowerblue": "#6495ed",
	"cornsilk": "#fff8dc",
	"crimson": "#dc143c",
	"cyan": "#00ffff",
	"darkblue": "#00008b",
	"darkcyan": "#008b8b",
	"darkgoldenrod": "#b8860b",
	"darkgray": "#a9a9a9",
	"darkgreen": "#006400",
	"darkgrey": "#a9a9a9",
	"darkkhaki": "#bdb76b",
	"darkmagenta": "#8b008b",
	"darkolivegreen": "#556b2f",
	"darkorange": "#ff8c00",
	"darkorchid": "#9932cc",
	"darkred": "#8b0000",
	"darksalmon": "#e9967a",
	"darkseagreen": "#8fbc8f",
	"darkslateblue": "#483d8b",
	"darkslategray": "#2f4f4f",
	"darkslategrey": "#2f4f4f",
	"darkturquoise": "#00ced1",
	"darkviolet": "#9400d3",
	"deeppink": "#ff1493",
	"deepskyblue": "#00bfff",
	"dimgray": "#696969",
	"dimgrey": "#696969",
	"dodgerblue": "#1e90ff",
	"firebrick": "#b22222",
	"floralwhite": "#fffaf0",
	"forestgreen": "#228b22",
	"fuchsia": "#ff00ff",
	"gainsboro": "#dcdcdc",
	"ghostwhite": "#f8f8ff",
	"gold": "#ffd700",
	"goldenrod": "#daa520",
	"gray": "#808080",
	"green": "#008000",
	"greenyellow": "#adff2f",
	"grey": "#808080",
	"honeydew": "#f0fff0",
	"hotpink": "#ff69b4",
	"indianred": "#cd5c5c",
	"indigo": "#4b0082",
	"ivory": "#fffff0",
	"khaki": "#f0e68c",
	"lavender": "#e6e6fa",
	"lavenderblush": "#fff0f5",
	"lawngreen": "#7cfc00",
	"lemonchiffon": "#fffacd",
	"lightblue": "#add8e6",
	"lightcoral": "#f08080",
	"lightcyan": "#e0ffff",
	"lightgoldenrodyellow": "#fafad2",
	"lightgray": "#d3d3d3",
	"lightgreen": "#90ee90",
	"lightgrey": "#d3d3d3",
	"lightpink": "#ffb6c1",
	"lightsalmon": "#ffa07a",
	"lightseagreen": "#20b2aa",
	"lightskyblue": "#87cefa",
	"lightslategray": "#778899",
	"lightslategrey": "#778899",
	"lightsteelblue": "#b0c4de",
	"lightyellow": "#ffffe0",
	"lime": "#00ff00",
	"limegreen": "#32cd32",
	"linen": "#faf0e6",
	"magenta": "#ff00ff",
	"maroon": "#800000",
	"mediumaquamarine": "#66cdaa",
	"mediumblue": "#0000cd",
	"mediumorchid": "#ba55d3",
	"mediumpurple": "#9370db",
	"mediumseagreen": "#3cb371",
	"mediumslateblue": "#7b68ee",
	"mediumspringgreen": "#00fa9a",
	"mediumturquoise": "#48d1cc",
	"mediumvioletred": "#c71585",
	"midnightblue": "#191970",
	"mintcream": "#f5fffa",
	"mistyrose": "#ffe4e1",
	"moccasin": "#ffe4b5",
	"navajowhite": "#ffdead",
	"navy": "#000080",
	"oldlace": "#fdf5e6",
	"olive": "#808000",
	"olivedrab": "#6b8e23",
	"orange": "#ffa500",
	"orangered": "#ff4500",
	"orchid": "#da70d6",
	"palegoldenrod": "#eee8aa",
	"palegreen": "#98fb98",
	"paleturquoise": "#afeeee",
	"palevioletred": "#db7093",
	"papayawhip": "#ffefd5",
	"peachpuff": "#ffdab9",
	"peru": "#cd853f",
	"pink": "#ffc0cb",
	"plum": "#dda0dd",
	"powderblue": "#b0e0e6",
	"purple": "#800080",
	"rebeccapurple": "#663399",
	"red": "#ff0000",
	"rosybrown": "#bc8f8f",
	"royalblue": "#4169e1",
	"saddlebrown": "#8b4513",
	"salmon": "#fa8072",
	"sandybrown": "#f4a460",
	"seagreen": "#2e8b57",
	"seashell": "#fff5ee",
	"sienna": "#a0522d",
	"silver": "#c0c0c0",
	"skyblue": "#87ceeb",
	"slateblue": "#6a5acd",
	"slategray": "#708090",
	"slategrey": "#708090",
	"snow": "#fffafa",
	"springgreen": "#00ff7f",
	"steelblue": "#4682b4",
	"tan": "#d2b48c",
	"teal": "#008080",
	"thistle": "#d8bfd8",
	"tomato": "#ff6347",
	"turquoise": "#40e0d0",
	"violet": "#ee82ee",
	"wheat": "#f5deb3",
	"white": "#ffffff",
	"whitesmoke": "#f5f5f5",
	"yellow": "#ffff00",
	"yellowgreen": "#9acd32"
};
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