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

			navigator.serviceWorker.addEventListener('message', (e) => {
				if (e.data.type === 'compromised') {
					alert('The connection you have with the server seems to be compromised' + 
						' this can either be because of a MITM attack or a compromised server' +
						', please investigate this further and be don\'t enter your password anywhere');
				}
			});
		}
	}
}