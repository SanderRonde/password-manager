interface Theme {
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
		light: string,
		/**
		 * The darker version of the accent color
		 */
		dark: string
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
	 * The greyest possible text that still fits the contrast spec on a white background
	 */
	minOppositeColorText: string,
	/**
	 * Regular black text on a white background
	 */
	textOnWhite: string,
	/**
	 * Regular white text on a black background
	 */
	textOnBlack: string,
	/**
	 * The default page background color
	 */
	background: string
}

export const theme: {
	light: Theme;
	dark: Theme;
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
			light: '#AE52D4',
			dark: '#4A0072'
		},
		error: '#F44336',
		success: '#2E7D32',
		minOppositeColorText: '#0000008C',
		textOnWhite: '#000000',
		textOnBlack: '#FFFFFF',
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
			light: '#4A0072',
			dark: '#AE52D4'
		},
		error: '#e34839',
		success: '#1dba25',
		minOppositeColorText: '#FFFFFF8C',
		textOnWhite: '#FFFFFF',
		textOnBlack: '#000000',
		background: '#171718'
	}
};