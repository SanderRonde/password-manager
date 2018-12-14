import { getCookie } from '../../../../../../../../shared/lib/webcomponent-util';
import { TypedNavigator } from '../../src/serviceworker';

declare const navigator: TypedNavigator;

export function registerServiceWorker() {
	if ('serviceWorker' in navigator) {
		window.addEventListener('load', () => {
			navigator.serviceWorker.register('/serviceworker.js', {
				scope: '/',
				type: 'classic'
			});
		});

		if (navigator.serviceWorker.controller) {
			const cookieTheme = getCookie('theme');

			if (cookieTheme) {
				navigator.serviceWorker.controller.postMessage({
					type: 'setCookie',
					data: {
						theme: cookieTheme
					}
				});	
			}
			navigator.serviceWorker.controller.postMessage({
				type: 'checkVersions'
			});
		}
	}
}