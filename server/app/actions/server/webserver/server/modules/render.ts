import { GlobalProperties } from '../../../../../../../shared/types/shared-types'
import { preAppHTML, postAppHTML, DEFAULT_FILES } from '../../client/html';
import { getFileContent, setBasePath } from "./resolveServerFile";
import { PROJECT_ROOT } from '../../../../../lib/constants';
import { requireES6File } from '../../../../../lib/util';
import { ServerResponse } from './ratelimit';
import mime = require('mime');
import * as path from 'path';

async function push(res: ServerResponse, file: string) {
	const nonAbsolute = file;
	if (file.startsWith('/')) {
		file = file.slice(1);
	}

	const content = await getFileContent(file);
	
	if (content === '') return;

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
		stream.write(content);
		stream.end();
	} catch(e) { }
}

function pushAll(res: ServerResponse, arr: string[]): Promise<void[]> {
	return Promise.all(arr.map((item) => {
		return push(res, item);
	}));
}

export async function render(res: ServerResponse, {
	title, script, isDevelopment, data, rootElement
}: {
	data: GlobalProperties;
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

	res.write(await preAppHTML({
		title,
		development: isDevelopment,
		bodyStyles: data.theme ? await (async () => {
			const { theme } = await requireES6File<{
				theme: {
					[key: string]: {
						background: string;
					}
				}
			}>(path.join(PROJECT_ROOT,
				'shared/components/theming/theme/theme.js'));
			const themeName = data.theme;
			return `style="background-color:${theme[themeName].background};`;
		})() : ''
	}));

	const propStr: string[] = [];
	for (const key in data) {
		const value = data[key as keyof typeof data];
		propStr.push(`prop_${key}="${value}"`);
	}
	res.write(`<${rootElement} _root ${propStr.join(' ')}></${rootElement}>`);

	res.write(postAppHTML({
		script
	}));

	res.end();
}