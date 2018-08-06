import { API_ERRS } from '../../../../../../../shared/types/api';
import { unref } from '../../../../../../test/lib/util';
import { getDebug } from '../../../../../lib/debug';
import { ServerConfig } from '../../../server';
import * as RateLimit from 'express-rate-limit'
import * as express from 'express'
import * as spdy from 'spdy';

export type APIResponse = {
	success: true;
	data: {
		[key: string]: any;
		[key: number]: any;
	}
}|{
	success: false;
	error: string;
	ERR: API_ERRS;
}

export interface ServerResponse extends express.Response, spdy.ServerResponse {
	__jsonResponse: APIResponse;
	json(data: APIResponse): express.Response;
}

//Use a stack with (timeout / 1000) items that gets
// pushed every second
class RatelimitStore<K extends string> {
	private _maxLength: number;
	private _secondCache: Map<K, number> = new Map();
	private _stack: Map<K, number>[] = [new Map()];

	constructor(timeout: number) {
		this._maxLength = timeout / 1000;
		const interval = setInterval(() => {
			this._shiftStack();
			this._secondCache.clear();
		}, 1000);
		unref(interval);
	}

	private _shiftStack() {
		this._stack.push(new Map());
		if (this._stack.length >= this._maxLength) {
			this._stack.shift();
		}
	}

	private _getIfAvailable(store: Map<K, number>, key: K): number {
		if (store.has(key)) {
			return store.get(key)!;
		}
		return 0;
	}

	private _getTotalForKey(key: K) {
		const latest = this._stack[this._stack.length - 1];
		if (this._secondCache.has(key)) {
			return this._secondCache.get(key)! + 
				this._getIfAvailable(latest, key);
		}
		let total: number = 0;
		for (let i = 0; i < this._stack.length - 1; i++) {
			total += this._getIfAvailable(this._stack[i], key);
		}
		this._secondCache.set(key, total);
		return total + this._getIfAvailable(latest, key);
	}

	incr(key: K, callback: (err: Error|undefined, current: number) => void) {
		//Get latest "second"
		const latest = this._stack[this._stack.length - 1];
		if (latest.has(key)) {
			latest.set(key, latest.get(key)! + 1);
		} else {
			latest.set(key, 1);
		}

		callback(undefined, this._getTotalForKey(key));
	}

	decrement(key: K) {
		const latest = this._stack[this._stack.length - 1];
		if (latest.has(key)) {
			latest.set(key, latest.get(key)! - 1);
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

function blockHandler(_req: express.Request, res: ServerResponse) {
	res.status(429);
	res.json({
		success: false,
		ERR: API_ERRS.TOO_MANY_REQUESTS,
		error: 'too many requests'
	});
}

function getBruteforceLimiter(factor: number) {
	const store = new RatelimitStore(60 * 1000 * factor);
	return new RateLimit({
		windowMs: 60 * 1000 * factor,
		store: store,
		delayAfter: 2,
		delayMs: 1000,
		max: 4,
		keyGenerator(req) {
			return (req.body && req.body.instance_id) || req.ip;
		},
		skipFailedRequests: true,
		skip(req, res: ServerResponse) {
			const key = (req.body && req.body.instance_id) || req.ip;
			res.once('finish', () => {
				if (res.__jsonResponse && res.__jsonResponse.success === false) {
					//If API request was unsuccessful count this request 
					store.incr(key, () => {});
				}
			});
			return true;
		},
		handler: blockHandler
	});
}

function noOp(_req: express.Request, _res: ServerResponse, next: express.NextFunction) {
	next();
}

export function getStores(config: ServerConfig) {
	if (config.rateLimit) {
		const factor = getDebug(config.debug).SPEED_UP_TIME_BY_4 ? 0.25 : 1;
		const instanceCreateLimiter = new RateLimit({
			windowMs: 60 * 1000 * factor,
			delayAfter: 0,
			max: 5,
			store: new RatelimitStore(60 * 1000 * factor),
			handler: blockHandler
		});
		const apiUseLimiter = new RateLimit({
			windowMs: 20 * 1000 * factor,
			delayAfter: 10,
			delayMs: 1000,
			max: 20,
			keyGenerator(req) {
				return (req.body && req.body.instance_id) || req.ip;
			},
			store: new RatelimitStore(20 * 1000 * factor),
			handler: blockHandler
		});
		return {
			bruteforceLimiter: getBruteforceLimiter(factor),
			instanceCreateLimiter,
			apiUseLimiter
		}
	} else {
		return {
			bruteforceLimiter: noOp,
			instanceCreateLimiter: noOp,
			apiUseLimiter: noOp
		}
	}
}