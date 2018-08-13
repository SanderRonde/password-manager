import { getCookie } from '../../../../../../../../shared/lib/webcomponent-util';
import { TypedNavigator } from '../../src/serviceworker';

declare const navigator: TypedNavigator;

if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/serviceworker.js', {
			scope: '/'
		});
	});

	if (navigator.serviceWorker.controller) {
		const cookieTheme = getCookie('theme');

		if (cookieTheme) {
			navigator.serviceWorker.controller.postMessage({
				type: 'setCookie',
				data: {
					cookie: cookieTheme
				}
			});	
		}
		navigator.serviceWorker.controller.postMessage({
			type: 'checkVersions'
		});
	}
}