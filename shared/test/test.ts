import { cryptoServerBrowserTest } from "./crypto.server-browser.test";
import { cryptoBrowserTest } from "./crypto.browser.test";

describe('Shared', () => {
	cryptoServerBrowserTest();
	cryptoBrowserTest();
});