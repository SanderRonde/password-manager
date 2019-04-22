import { GlobalProperties } from '../../types/shared-types';
import { WebComponentThemeManger } from './theme-manager';
import { EventListenerObj } from './listener';
import { CHANGE_TYPE } from './base';
import { directive } from 'lit-html';

export abstract class WebComponentI18NManager<E extends EventListenerObj> extends WebComponentThemeManger<E> {
	private static _path: string = '/i18n/';
	private static _langFiles: {
		[key: string]: {
			[key: string]: string;
		}
	} = {};
	private static _langPromises: {
		[key: string]: Promise<{
			[key: string]: string;
		}>;
	} = {};
	private static _loadingLang: string|null = null;
	private static _currentLang: string|null = null;
	private static _defaultLang: string|null = null;
	private _elementLang: string|null = null;

	constructor() {
		super();

		this.listenGP<GlobalProperties, 'lang'>('globalPropChange', (prop, value) => {
			if (prop === 'lang') {
				this.__setLang(value!);
			}
		});
		this._setInitialLang();
	}

	private _setInitialLang() {
		const lang = this.globalProps<GlobalProperties>().get('lang');
		if (lang === undefined) {
			this.__setLang(WebComponentI18NManager._loadingLang!);
		}
	}

	public setLang<L extends string>(lang: L) {
		this.globalProps<GlobalProperties>().set('lang', lang);
	}

	public getLang() {
		return WebComponentI18NManager._currentLang!;
	}

	private async __setLang(lang: string) {
		if (WebComponentI18NManager._loadingLang !== lang) {
			WebComponentI18NManager._loadingLang = lang;
			await WebComponentI18NManager._loadLang(lang);
			WebComponentI18NManager._currentLang = lang;
		}
		if (this._elementLang !== lang) {
			this._elementLang = lang;
			this.renderToDOM(CHANGE_TYPE.LANG);
		}
	}

	private static async _loadLang(lang: string) {
		if (lang in this._langPromises) return;
		const prom = fetch(`${this._path}${lang}.json`).then(r => r.json());
		this._langPromises[lang] = prom;
		this._langFiles[lang] = await prom;
	}

	public static initI18N({
		path,
		defaultLang
	}: {
		path: string;
		defaultLang: string;
	}) {
		if (!path.endsWith('/')) {
			path = path + '/';
		}
		this._path = path;
		this._defaultLang = defaultLang;
	}

	private get _lang() {
		return WebComponentI18NManager._currentLang ||
			WebComponentI18NManager._loadingLang! ||
			WebComponentI18NManager._defaultLang!
	}

	private async _loadCurrentLang() {
		if (this._lang in WebComponentI18NManager._langPromises) return;
		WebComponentI18NManager._loadLang(this._lang);
		await WebComponentI18NManager._langPromises[this._lang];
	}

	private get _isReady() {
		return this._lang in WebComponentI18NManager._langFiles;
	}

	private async _waitForKey(key: string) {
		await this._loadCurrentLang();
		return WebComponentI18NManager._langFiles[this._lang][key];
	}

	public __prom(key: string) {
		if (this._isReady) {
			return WebComponentI18NManager._langFiles[this._lang][key]
		}
		return this._waitForKey(key);
	}

	private static _createWaiter(promise: Promise<string>, content: string) {
		return directive((part) => {
			part.setValue(content);
			part.commit();
			promise.then((value) => {
				if (part.value === content) {
					part.setValue(value);
					part.commit();
				}
			});
		});
	}

	private _preprocess(prom: Promise<string>, process?: (str: string) => string): Promise<string> {
		if (!process) return prom;

		return new Promise<string>(async (resolve) => {
			resolve(process(await prom));
		});
	}

	public __(key: string, process?: (str: string) => string) {
		const value = this.__prom(key);
		if (typeof value === 'string') return process ? process(value) : value;

		return WebComponentI18NManager._createWaiter(
			this._preprocess(value, process), `{{${key}}}`);
	}
}