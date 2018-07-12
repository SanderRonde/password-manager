import { MainExports } from "../../app/main";
import importFresh = require('import-fresh');
import { EventEmitter } from "events";
import { Readable } from "stream";

export function getFreshMain(): MainExports {
	return importFresh('../../app/main');
}

export function unref(...emitters: (EventEmitter|{
	unref(): void;
})[]) {
	for (const emitter of emitters) {
		(emitter as any).unref &&
			(emitter as any).unref();
	}
}

export function listenWithoutRef(src: Readable, handler: (chunk: string) => void) {
	src.on('data', (chunk) => {
		handler(chunk.toString());
	});
	unref(src);
}