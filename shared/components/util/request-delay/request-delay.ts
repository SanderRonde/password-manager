/// <reference path="../../../types/elements.d.ts" />

import { config, defineProps, PROP_TYPE, ComplexType, wait } from '../../../lib/webcomponent-util';
import { ConfigurableWebComponent } from '../../../lib/webcomponents';
import { RequestDelayIDMap } from './request-delay-querymap';
import { PaperToast } from '../paper-toast/paper-toast';
import { RequestDelayHTML } from './request-delay.html';
import { bindToClass } from '../../../lib/decorators';
import { RequestDelayCSS } from './request-delay.css';
import { APIFns } from '../../../types/api';

type APIRequestQueueItem<R> = {
	fn: () => Promise<R>|R;
	api: keyof APIFns;
}

class RateLimitStore {
	constructor(private _config: {
		window: number;
		max: number;
		delayAfter: number;
		delayMs: number;
		onSuccess: boolean;
	}) {
		this._maxLength = _config.window / 1000;
		window.setInterval(() => {
			this._shiftStack();
		}, 1000);
	}

	private _maxLength: number;
	private _stack: Map<number, number> = new Map();
	private _seconds: number = 0;
	private _lastIndex: number = 0;

	private _shiftStack() {
		this._seconds++;
		this._stack.delete(this._seconds - (this._maxLength + 1));
		this._stack.set(this._seconds, 0);
		this._lastIndex = Math.max(this._lastIndex, this._seconds);
	}

	private _getFullTotal() {
		let total = 0;
		for (const value of this._stack.values()) {
			total += value;
		}
		return total;
	}

	private _getLastX(amount: number) {
		for (let i = this._lastIndex; i >= this._seconds - this._maxLength; i--) {
			amount -= this._stack.get(i) || 0;
			if (amount <= 0) {
				return i;
			}
		}
		return this._seconds - this._maxLength;
	}

	private _incrementAtTime(relativeSeconds: number) {
		const seconds = relativeSeconds + this._seconds;
		this._stack.set(seconds, (this._stack.get(seconds) || 0) + 1);
		this._maxLength = Math.max(this._maxLength, seconds);
	}

	public getRequestTime() {
		const total = this._getFullTotal();
		if (total > this._config.delayAfter) {
			//Check when the first delay one was sent
			const firstSent = this._getLastX(this._config.delayAfter);

			//Wait that one out
			const firstRequestWindowExit = Math.min(this._maxLength, 
				this._maxLength - firstSent);

			//Wait it out
			return firstRequestWindowExit;
		} else {
			//Can be run immediately
			return 0;	
		}
	}

	public pushRequestAtTime(ms: number) {
		this._incrementAtTime(Math.ceil(ms));
	}
}


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

	private readonly _instanceCreateLimiter: RateLimitStore = new RateLimitStore({
		window: 60 * 1000,
		delayAfter: Infinity,
		delayMs: 0,
		max: 5,
		onSuccess: true,
	});
	private readonly _apiUseLimiter: RateLimitStore = new RateLimitStore({
		window: 20 * 1000,
		delayAfter: 10,
		delayMs: 1000,
		max: 20,
		onSuccess: true,
	});
	private readonly _bruteforceLimiter: RateLimitStore = new RateLimitStore({
		window: 60 * 1000,
		delayAfter: 2,
		delayMs: 1000,
		max: 4,
		onSuccess: false
	});

	private readonly _ratelimitMap: {
		[P in keyof APIFns]: RateLimitStore[];
	} = {
		'/api/instance/register': [this._bruteforceLimiter, this._instanceCreateLimiter],
		'/api/instance/login': [this._bruteforceLimiter, this._instanceCreateLimiter],
		'/api/instance/logout': [this._bruteforceLimiter, this._instanceCreateLimiter],
		'/api/instance/extend_key': [this._bruteforceLimiter, this._instanceCreateLimiter],

		'/api/instance/2fa/enable': [this._bruteforceLimiter, this._apiUseLimiter],
		'/api/instance/2fa/disable': [this._bruteforceLimiter, this._apiUseLimiter],
		'/api/instance/2fa/confirm': [this._bruteforceLimiter, this._apiUseLimiter],
		'/api/instance/2fa/verify': [this._bruteforceLimiter, this._apiUseLimiter],
		'/api/instance/2fa/is_setup': [this._bruteforceLimiter],

		'/api/instance/u2f/enable': [this._bruteforceLimiter, this._apiUseLimiter],
		'/api/instance/u2f/disable': [this._bruteforceLimiter, this._apiUseLimiter],
		'/api/instance/u2f/confirm': [this._bruteforceLimiter, this._apiUseLimiter],
		'/api/instance/u2f/verify': [this._bruteforceLimiter, this._apiUseLimiter],
		'/api/instance/u2f/is_setup': [this._bruteforceLimiter],
		'/api/instance/u2f/gen_request': [this._bruteforceLimiter],

		'/api/password/set': [this._bruteforceLimiter, this._apiUseLimiter],
		'/api/password/update': [this._bruteforceLimiter, this._apiUseLimiter],
		'/api/password/remove': [this._bruteforceLimiter, this._apiUseLimiter],
		'/api/password/get': [this._bruteforceLimiter, this._apiUseLimiter],
		'/api/password/getmeta': [this._bruteforceLimiter, this._apiUseLimiter],
		'/api/password/querymeta': [this._bruteforceLimiter, this._apiUseLimiter],
		'/api/password/allmeta': [this._bruteforceLimiter, this._apiUseLimiter],

		'/api/user/reset': [this._bruteforceLimiter, this._apiUseLimiter],
		'/api/user/genresetkey': [this._bruteforceLimiter, this._apiUseLimiter],

		'/api/dashboard/login': [this._bruteforceLimiter, this._instanceCreateLimiter],
		'/api/dashboard/get_comm': [this._bruteforceLimiter, this._apiUseLimiter]
	};

	private _requests: {
		fn: () => Promise<boolean>;
		api: keyof APIFns;	
	}[] = [];

	constructor() {
		super();
		window.setInterval(this.updateTimer, 1000);

		PaperToast.listen((type) => {
			if (type === 'show') {
				this.classList.add('move');
			} else {
				this.classList.remove('move');
			}
		});
	}

	@bindToClass
	public updateTimer() {
		this.props.secs = Math.max(this.props.secs - 1, 0);

		if (this.props.secs === 0) {
			this._sendNextRequest();
		}
	}

	private _getTime(request: APIRequestQueueItem<any>): number {
		const limiters = this._ratelimitMap[request.api];
		let time: number = -Infinity;
		
		//Get longest time
		for (const limiter of limiters) {
			time = Math.max(time, limiter.getRequestTime());
		}
		
		return time;
	}

	private _setAnimation(time: number) {
		this.$.animationLine.animate([{
			transform: 'scaleX(0)'
		} as any, {
			transform: 'scaleX(1)'
		} as any], {
			duration: time,
			fill: 'forwards',
			easing: 'linear'
		});
	}

	private _hiddenState: 'sending'|'waiting'|'sendingToWaiting' = 'waiting';
	private async _setState(state: 'sending'|'waiting') {
		if (state === 'sending' && this._hiddenState === 'waiting') {
			//Wait for 50ms, if the status hasn't been reset to waiting then, set it to sending
			this._hiddenState = 'sendingToWaiting';
			await wait(50);
			if (this._hiddenState === 'sendingToWaiting') {
				this._hiddenState = this.props.state = 'sending';
			}
		} else if (state === 'waiting') {
			this._hiddenState = this.props.state = 'waiting';
		}
	}

	private async _sendNextRequest() {
		if (this.props.state === 'sending' || this._requests.length === 0) {
			return;
		}

		this.props.secs = this._getTime(this._requests[0]);
		this.props.secs = Math.max(this.props.secs, 0);
		this._setAnimation(this.props.secs);

		//Apply time
		this._apiUseLimiter.pushRequestAtTime(this.props.secs);
		this._instanceCreateLimiter.pushRequestAtTime(this.props.secs);

		const time = this.props.secs;

		this._setState('sending');
		const success = await this._requests[0].fn();
		if (!success) {
			this._bruteforceLimiter.pushRequestAtTime(time);
		}
		this._requests.splice(0, 1);
		this.props.requests--;
		this._setState('waiting');

		if (this._requests.length === 0) {
			this.hide();
		}
	}

	public show() {
		this.classList.add('show');
	}

	public hide() {
		this.classList.remove('show');
	}

	public pushRequest<R extends {
		success: boolean;
	}>(request: APIRequestQueueItem<R>): Promise<R> {
		return new Promise<R>((resolve) => {
			this._requests.push({
				api: request.api,
				fn: async () => {
					const result = await request.fn();
					resolve(result);
					return result.success;
				}
			});
			this.props.requests++;

			if (this.props.requests > 1) {
				this.show();
			}
			if (this.props.secs === 0 && this.props.state === 'waiting') {
				this._sendNextRequest();
			}
		});
	}
}