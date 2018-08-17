import { cryptoServerBrowserTest } from "./crypto.server-browser.test";
import { cryptoBrowserTest } from "./crypto.browser.test";

export function sharedTest() {
	describe('Shared', function() {
		this.timeout(5000);
		this.slow(5000);
		
		cryptoServerBrowserTest();
		cryptoBrowserTest();
	});
}

if (require.main === module) {
	sharedTest();
}