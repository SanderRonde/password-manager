import { VALID_THEMES_T as VALID_THEMES_T, Theme } from '../../../types/shared-types';

export const VALID_THEMES: VALID_THEMES_T[] = ['light', 'dark'];

export const theme: {
	[T in VALID_THEMES_T]: Theme;
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
		card: '#FFFFFF',
		error: '#F44336',
		success: '#2E7D32',
		minOppositeColorText: '#0000008C',
		textOnBackground: '#000000',
		textOnNonbackground: '#FFFFFF',
		background: '#F8F8F8'
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
		card: '#171718',
		error: '#e34839',
		success: '#1dba25',
		minOppositeColorText: '#FFFFFF8C',
		textOnBackground: '#FFFFFF',
		textOnNonbackground: '#000000',
		background: '#171718'
	}
};