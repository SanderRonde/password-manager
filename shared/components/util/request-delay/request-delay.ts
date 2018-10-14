/// <reference path="../../../types/elements.d.ts" />

import { config, defineProps, PROP_TYPE, ComplexType } from '../../../lib/webcomponent-util';
import { ConfigurableWebComponent } from '../../../lib/webcomponents';
import { RequestDelayIDMap } from './request-delay-querymap';
import { RequestDelayHTML } from './request-delay.html';
import { RequestDelayCSS } from './request-delay.css';
import { APIFns } from '../../../types/api';

interface APIRequestQueueItem {
	fn: () => Promise<void>|void;
	api: keyof APIFns;
}

interface Ratelimiter {
	window: number;
	max: number;
	delayAfter: number;
	delayMs: number;
	onSuccess: boolean;
}

class RatelimitStore {
	private _maxLength: number;
	private _stack: number[] = [];

	constructor(config: {
		window: number;
		max: number;
		delayAfter: number;
		delayMs: number;
		onSuccess: boolean;
	}) {
		this._maxLength = config.window / 1000;
		window.setInterval(() => {
			this._shiftStack();
		}, 1000);
	}

	private _shiftStack() {
		this._stack.push(0);
		if (this._stack.length >= this._maxLength) {
			this._stack.shift();
		}
	}

	private _getTotal() {
		if (this._stack.length === 0) {
			return 0;
		}
		return this._stack.reduce((prev, current) => {
			return prev + current;
		}, 0);
	}

	incr(callback: (err: Error|undefined, current: number) => void) {
		//Get latest "second"
		this._stack[this._stack.length - 1] += 1;

		callback(undefined, this._getTotal());
	}

	decrement() {
		this._stack[this._stack.length - 1] -= 1;
	}

	resetAll() {
		while (this._stack.pop()) { }
		this._stack.push(0);
	}

	resetKey() {
		this._stack = this._stack.map(_ => 0);
	}
}
new RatelimitStore({} as any);

@config({
	is: 'request-delay',
	css: RequestDelayCSS,
	html: RequestDelayHTML
})
export class RequestDelay extends ConfigurableWebComponent<RequestDelayIDMap> {
	props = defineProps(this, {
		reflect: {
			requests: {
				type: PROP_TYPE.NUMBER,
				value: 0,
				coerce: true
			},
			secs: {
				type: PROP_TYPE.NUMBER,
				value: 0,
				coerce: true
			},
			state: {
				type: ComplexType<'sending'|'waiting'>(),
				value: 'waiting'
			}
		}
	});

	private static readonly _instanceCreateLimiter: Ratelimiter = {
		window: 60 * 1000,
		delayAfter: 0,
		delayMs: 0,
		max: 5,
		onSuccess: true,
	};
	private static readonly _apiUseLimiter: Ratelimiter = {
		window: 20 * 1000,
		delayAfter: 10,
		delayMs: 1000,
		max: 20,
		onSuccess: true,
	};
	private static readonly _bruteforceLimiter: Ratelimiter = {
		window: 60 * 1000,
		delayAfter: 2,
		delayMs: 1000,
		max: 4,
		onSuccess: false
	};

	private static readonly _ratelimitMap: {
		[P in keyof APIFns]: Ratelimiter[];
	} = {
		'/api/instance/register': [RequestDelay._bruteforceLimiter, RequestDelay._instanceCreateLimiter],
		'/api/instance/login': [RequestDelay._bruteforceLimiter, RequestDelay._instanceCreateLimiter],
		'/api/instance/logout': [RequestDelay._bruteforceLimiter, RequestDelay._instanceCreateLimiter],
		'/api/instance/extend_key': [RequestDelay._bruteforceLimiter, RequestDelay._instanceCreateLimiter],

		'/api/instance/2fa/enable': [RequestDelay._bruteforceLimiter, RequestDelay._apiUseLimiter],
		'/api/instance/2fa/disable': [RequestDelay._bruteforceLimiter, RequestDelay._apiUseLimiter],
		'/api/instance/2fa/confirm': [RequestDelay._bruteforceLimiter, RequestDelay._apiUseLimiter],
		'/api/instance/2fa/verify': [RequestDelay._bruteforceLimiter, RequestDelay._apiUseLimiter],
		'/api/instance/2fa/is_setup': [RequestDelay._bruteforceLimiter],

		'/api/instance/u2f/enable': [RequestDelay._bruteforceLimiter, RequestDelay._apiUseLimiter],
		'/api/instance/u2f/disable': [RequestDelay._bruteforceLimiter, RequestDelay._apiUseLimiter],
		'/api/instance/u2f/confirm': [RequestDelay._bruteforceLimiter, RequestDelay._apiUseLimiter],
		'/api/instance/u2f/verify': [RequestDelay._bruteforceLimiter, RequestDelay._apiUseLimiter],
		'/api/instance/u2f/is_setup': [RequestDelay._bruteforceLimiter],
		'/api/instance/u2f/gen_request': [RequestDelay._bruteforceLimiter],

		'/api/password/set': [RequestDelay._bruteforceLimiter, RequestDelay._apiUseLimiter],
		'/api/password/update': [RequestDelay._bruteforceLimiter, RequestDelay._apiUseLimiter],
		'/api/password/remove': [RequestDelay._bruteforceLimiter, RequestDelay._apiUseLimiter],
		'/api/password/get': [RequestDelay._bruteforceLimiter, RequestDelay._apiUseLimiter],
		'/api/password/getmeta': [RequestDelay._bruteforceLimiter, RequestDelay._apiUseLimiter],
		'/api/password/querymeta': [RequestDelay._bruteforceLimiter, RequestDelay._apiUseLimiter],
		'/api/password/allmeta': [RequestDelay._bruteforceLimiter, RequestDelay._apiUseLimiter],

		'/api/user/reset': [RequestDelay._bruteforceLimiter, RequestDelay._apiUseLimiter],
		'/api/user/genresetkey': [RequestDelay._bruteforceLimiter, RequestDelay._apiUseLimiter],

		'/api/dashboard/login': [RequestDelay._bruteforceLimiter, RequestDelay._instanceCreateLimiter],
		'/api/dashboard/get_comm': [RequestDelay._bruteforceLimiter, RequestDelay._apiUseLimiter]
	};

	private _requests: APIRequestQueueItem[] = [];
	private _currentSecs: number = 0;

	constructor() {
		super();
		window.setInterval(this.updateTimer, 1000);
	}

	public updateTimer() {
		this.props.secs = Math.max(this._getSecs(), 0);
		this._currentSecs = Math.max(this._currentSecs - 1, 0);
	}

	private _getTime(_request: APIRequestQueueItem): number {
		RequestDelay._ratelimitMap;
		return 0;
	}

	private _getSecs(): number {
		let time: number = this._currentSecs;
		if (this._requests.length === 0) {
			return time;
		}
		return time + this._requests.reduce((prev, current) => {
			return prev + this._getTime(current);
		}, 0);
	}

	public cancelNextRequest() {
		if (this._requests.length <= 1) return;
		this._requests.splice(2, 1);
		this.props.requests -= 1;
	}

	public pushRequest(_request: APIRequestQueueItem) {

	}
}