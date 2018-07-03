import RateLimit = require('express-rate-limit');
import express = require('express');

export type APIResponse = {
	success: true;
	data: {
		[key: string]: any;
		[key: number]: any;
	}
}|{
	success: false;
	error: string;
}

export interface ResponseCaptured extends express.Response {
	__jsonResponse: APIResponse;
	json(data: APIResponse): express.Response;
}

//Use a stack with (timeout / 1000) items that gets
// pushed every second
class RatelimitStore<K extends string> {
	private _maxLength: number;
	private _secondCache: Map<K, number> = new Map();
	private _stack: Map<K, number>[] = [];

	constructor(timeout: number) {
		this._maxLength = timeout / 1000;
		const interval = setInterval(() => {
			this._shiftStack();
			this._secondCache.clear();
		}, 1000);
		if (interval.unref) {
			interval.unref();
		}
	}

	private _shiftStack() {
		if (this._stack.length >= this._maxLength) {
			this._stack.shift();
			this._stack.push(new Map());
		}
	}

	private _getIfAvailable(store: Map<K, number>, key: K): number {
		if (store.has(key)) {
			return store.get(key);
		}
		return 0;
	}

	private _getTotalForKey(key: K) {
		const latest = this._stack[this._stack.length - 1];
		if (this._secondCache.has(key)) {
			return this._secondCache.get(key) + 
				this._getIfAvailable(latest, key);
		}
		let total: number = 0;
		for (let i = 0; i < this._stack.length - 1; i++) {
			total += this._getIfAvailable(this._stack[i], key);
		}
		this._secondCache.set(key, total);
		return total + this._getIfAvailable(latest, key);
	}

	incr(key: K, callback: (err: Error, current: number) => void) {
		//Get latest "second"
		const latest = this._stack[this._stack.length - 1];
		if (latest.has(key)) {
			latest.set(key, latest.get(key) + 1);
		} else {
			latest.set(key, 1);
		}

		callback(null, this._getTotalForKey(key));
	}

	decrement(key: K) {
		const latest = this._stack[this._stack.length - 1];
		if (latest.has(key)) {
			latest.set(key, latest.get(key) - 1);
		} else {
			latest.set(key, -1);
		}
	}

	resetAll() {
		while (this._stack.pop()) { }
		this._stack.push(new Map());
		this._secondCache.clear();
	}

	resetKey(key: K) {
		for (const map of this._stack) {
			if (map.has(key)) {
				map.delete(key);
			}
		}
	}
}

function blockHandler(_req: express.Request, res: ResponseCaptured) {
	res.format({
		html() {
			res.status(429).end('too many requests');
		},
		json() {
			res.status(429).json({
				success: false,
				error: 'too many requests'
			});
		}
	});
}

function getBruteforceLimiter() {
	const store = new RatelimitStore(60 * 1000);
	return new RateLimit({
		windowMs: 60 * 1000,
		store: store,
		delayAfter: 2,
		delayMs: 1000,
		max: 4,
		message: 'too many requests',
		keyGenerator(req) {
			return (req.body && req.body.instance_id) || req.ip;
		},
		skipFailedRequests: true,
		skip(req, res: ResponseCaptured) {
			res.on('finish', () => {
				if (res.__jsonResponse && res.__jsonResponse.success === false) {
					//If API request was unsuccessful count this request 
					store.incr((req.body && req.body.instance_id) || req.ip, () => {});
				}
			});
			return true;
		},
		handler: blockHandler
	});
}

export function getStores() {
	const instanceCreateLimiter = new RateLimit({
		windowMs: 60 * 1000,
		delayAfter: 0,
		max: 5,
		message: 'too many requests',
		store: new RatelimitStore(60 * 1000),
		handler: blockHandler
	});
	const apiUseLimiter = new RateLimit({
		windowMs: 20 * 1000,
		delayAfter: 10,
		delayMs: 1000,
		max: 20,
		message: 'too many requests',
		keyGenerator(req) {
			return (req.body && req.body.instance_id) || req.ip;
		},
		store: new RatelimitStore(20 * 1000),
		handler: blockHandler
	});

	return {
		bruteforceLimiter: getBruteforceLimiter(),
		instanceCreateLimiter,
		apiUseLimiter
	}
}