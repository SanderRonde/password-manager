import { DEVELOPMENT_SERVE_PATHS, PRODUCTION_SERVE_PATHS } from '../webserver';
import { preAppHTML, postAppHTML, DEFAULT_FILES } from '../../client/html';
import { ServerResponse } from './ratelimit';
import fs = require('fs-extra');
import path = require('path');
import mime = require('mime');

let basePath: string[]|null = null;
function setBasePath(isDevelopment: boolean) {
	if (isDevelopment) {
		basePath = DEVELOPMENT_SERVE_PATHS;
	} else {
		basePath = PRODUCTION_SERVE_PATHS;
	}
}

const fileCache: Map<string, string> = new Map();
const resolvedPaths: Map<string, string|null> = new Map();

async function resolveFile(file: string, paths: string[]): Promise<string|null> {
	const result = (await Promise.all(paths.map((possiblePrefix) => {
		return new Promise<string|null>((resolve) => {
			const fullPath = path.join(possiblePrefix, file);
			fs.access(fullPath, (err) => {
				if (err) {
					resolve(null);
				} else {
					resolve(fullPath);
				}
			});
		});
	}))).filter(res => res !== null)[0];
	if (!result) {
		console.log('Failed to resolve file', file, 'against paths', paths);
		return null;
	}
	return result;
}

async function getFileContent(file: string): Promise<string> {
	if (fileCache.has(file)) {
		return fileCache.get(file)!;
	}
	const content = await fs.readFile(file, {
		encoding: 'utf8'
	});
	fileCache.set(file, content);
	return content;
}

async function push(res: ServerResponse, file: string) {
	const nonAbsolute = file;
	if (file.startsWith('/')) {
		file = file.slice(1);
	}
	if (resolvedPaths.has(file)) {
		file = resolvedPaths.get(file)!;
	} else {
		const resolved = await resolveFile(file, basePath!);
		file = resolved!;
		resolvedPaths.set(nonAbsolute, file);
	}

	if (file === null) return;

	try {
		const stream = res.push(nonAbsolute, {
			request: {
				'accept': '*/*'
			},
			response: {
				'Content-Type': mime.getType(file)
			}
		});
		stream.on('error', () => { });
		const content = await getFileContent(file);
		stream.write(content);
		stream.end();
	} catch(e) { }
}

function pushAll(res: ServerResponse, arr: string[]): Promise<void[]> {
	return Promise.all(arr.map((item) => {
		return push(res, item);
	}));
}

export async function render<D = {
	[key: string]: string;
}>(res: ServerResponse, {
	title, script, isDevelopment, data, rootElement
}: {
	data: D;
	title: string;
	script: string;
	rootElement: string;
	isDevelopment: boolean;
}) {
	setBasePath(isDevelopment);

	if ('push' in res) {
		await Promise.all([
			pushAll(res, DEFAULT_FILES.css),
			pushAll(res, DEFAULT_FILES.scripts),
			push(res, script)
		]);
	}

	res.write(preAppHTML({
		title,
		development: isDevelopment
	}));

	res.write(`<${rootElement}></${rootElement}>`);
	res.write(`<textarea id="data" hidden>${JSON.stringify(data)}</textarea>`)

	res.write(postAppHTML({
		script
	}));

	res.end();
}