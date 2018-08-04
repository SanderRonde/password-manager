import { preAppHTML, postAppHTML } from '../../client/html';
import { ResponseCaptured } from './ratelimit';

export type DevData = {
	enabled: true;
	cssPaths: string[];
}|{
	enabled: false;
};
export async function render(res: ResponseCaptured, {
	title, script, devData, data, rootName
}: {
	data: any;
	title: string;
	script: string;
	rootName: string;
	devData: DevData;
}) {
	if (devData.enabled) {
		res.write(preAppHTML({
			title,
			development: true,
			css: []
			// css: await gatherCSS(devData.cssPaths)
		}))
	} else {
		res.write(preAppHTML({
			title,
			development: false
		}));
	}

	res.write(`<${rootName}></${rootName}/>`);
	res.write(`<textarea hidden>${JSON.stringify(data)}</textarea>`)

	res.write(postAppHTML({
		script
	}));

	res.end();
}