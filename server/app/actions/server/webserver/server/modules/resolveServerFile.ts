import * as fs from 'fs-extra';
import * as path from 'path';

import { DEVELOPMENT_SERVE_PATHS, PRODUCTION_SERVE_PATHS } from "../webserver";
export const INLINED_FILES = {
	css: ['/css/default.css'],
	scripts: []
};
let basePath: string[] | null = null;
export function setBasePath(isDevelopment: boolean) {
	if (isDevelopment) {
		basePath = DEVELOPMENT_SERVE_PATHS;
	}
	else {
		basePath = PRODUCTION_SERVE_PATHS;
	}
}
const fileCache: Map<string, string> = new Map();
export const resolvedPaths: Map<string, string | null> = new Map();
async function resolveFile(file: string, paths: string[]): Promise<string | null> {
	const result = (await Promise.all(paths.map((possiblePrefix) => {
		return new Promise<string | null>((resolve) => {
			const fullPath = path.join(possiblePrefix, file);
			fs.access(fullPath, (err) => {
				if (err) {
					resolve(null);
				}
				else {
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
async function getResolved(filePath: string): Promise<string | null> {
	if (resolvedPaths.has(filePath)) {
		return resolvedPaths.get(filePath)!;
	}
	else {
		const resolved = await resolveFile(filePath, basePath!);
		resolvedPaths.set(filePath, resolved);
		return resolved!;
	}
}
export async function getFileContent(filePath: string): Promise<string> {
	if (fileCache.has(filePath)) {
		return fileCache.get(filePath)!;
	}
	const resolved = await getResolved(filePath);
	if (resolved === null)
		return '';
	const content = await fs.readFile(resolved, {
		encoding: 'utf8'
	});
	fileCache.set(filePath, content);
	return content;
}