export interface Theme {
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
	},
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
	},
	/**
	 * The color of error messages
	 */
	error: string,
	/**
	 * The color of success messages
	 */
	success: string,
	/**
	 * The greyest possible text that still fits the contrast spec on this theme's background
	 */
	minOppositeColorText: string,
	/**
	 * Regular black text on this theme's background color
	 */
	textOnBackground: string,
	/**
	 * Regular white text on the opposite of this theme's background color
	 */
	textOnNonbackground: string,
	/**
	 * The default page background color
	 */
	background: string
}

export type VALID_THEMES = 'light'|'dark';
export const VALID_THEMES: VALID_THEMES[] = ['light', 'dark'];

export const theme: {
	[T in VALID_THEMES]: Theme;
} = {
	light: {
		primary: {
			main: '#607d8b',
			weak: '#b5c5cd',
			hover: '#d0dbe1',
			heavy: '#1C313A'
		},
		accent: {
			main: '#7B1FA2',
			weak: '#AE52D4',
			hover: '#AE52D4',
			heavy: '#4A0072'
		},
		error: '#F44336',
		success: '#2E7D32',
		minOppositeColorText: '#0000008C',
		textOnBackground: '#000000',
		textOnNonbackground: '#FFFFFF',
		background: '#FFFFFF'
	},
	dark: {
		primary: {
			main: '#61a1c0',
			weak: '#274351',
			hover: '#5fafd6',
			heavy: '#77bddf'
		},
		accent: {
			main: '#7B1FA2',
			weak: '#4A0072',
			hover: '#4A0072',
			heavy: '#AE52D4'
		},
		error: '#e34839',
		success: '#1dba25',
		minOppositeColorText: '#FFFFFF8C',
		textOnBackground: '#FFFFFF',
		textOnNonbackground: '#000000',
		background: '#171718'
	}
};