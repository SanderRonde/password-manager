import { VALID_THEMES_T as VALID_THEMES_T, Theme } from '../../../types/shared-types';

export const VALID_THEMES: VALID_THEMES_T[] = ['light', 'dark'];

export interface ProjectTheme extends Theme {
	/**
	 * The primary color
	 */
	primary: {
		/**
		 * The main primary color
		 */
		main: string,
		/**
		 * The weaker/lighter version of the primary color
		 */
		weak: string,
		/**
		 * The even lighter version that appears when you hover over it
		 */
		hover: string,
		/**
		 * The heavier version of the primary color
		 */
		heavy: string
	};
	/**
	 * The accent/secondary color
	 */
	accent: {
		/**
		 * The main accent color
		 */
		main: string,
		/**
		 * The lighter version of the accent color
		 */
		weak: string,
		/**
		 * The even lighter version that appears when you hover over it
		 */
		hover: string,
		/**
		 * The darker version of the accent color
		 */
		heavy: string
	};
	/**
	 * The color of a material design card
	 */
	card: string;
	/**
	 * The greyest possible text that still fits the contrast spec on this theme's background
	 */
	minOppositeColorText: string;
	/**
	 * Regular white text on the opposite of this theme's background color
	 */
	textOnNonbackground: string;
	/**
	 * A background-color opposite to the regular one in this theme
	 */
	oppositeBackground: string;
}

export const theme: {
	[T in VALID_THEMES_T]: ProjectTheme;
} = {
	light: {
		primary: {
			main: '#607d8b',
			weak: '#7799a9',
			hover: '#d0dbe1',
			heavy: '#1C313A'
		},
		accent: {
			main: '#7B1FA2',
			weak: '#AE52D4',
			hover: '#AE52D4',
			heavy: '#4A0072'
		},
		card: '#FFFFFF',
		error: '#F44336',
		success: '#2E7D32',
		minOppositeColorText: '#0000008C',
		text: '#000000',
		textOnNonbackground: '#FFFFFF',
		background: '#F8F8F8',
		oppositeBackground: '#171718'
	},
	dark: {
		primary: {
			main: '#61a1c0',
			weak: '#a3c3d3',
			hover: '#5fafd6',
			heavy: '#77bddf'
		},
		accent: {
			main: '#7B1FA2',
			weak: '#4A0072',
			hover: '#4A0072',
			heavy: '#AE52D4'
		},
		card: '#222222',
		error: '#e34839',
		success: '#1dba25',
		minOppositeColorText: '#FFFFFF8C',
		text: '#E1E1E1',
		textOnNonbackground: '#000000',
		background: '#171718',
		oppositeBackground: '#F8F8F8'
	}
};