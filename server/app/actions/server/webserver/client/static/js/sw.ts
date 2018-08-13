import { TypedNavigator } from "../serviceworker";

declare const navigator: TypedNavigator;

if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/serviceworker.js', {
			scope: '/'
		});
	});

	navigator.serviceWorker.controller &&
		navigator.serviceWorker.controller.postMessage({
			type: 'checkVersions'
		});
}