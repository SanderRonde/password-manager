import { getFreePort } from '../../../server/test/unit/lib/util';
import { getComponent } from "./component-server";
import * as express from 'express';
import * as http from 'http';

function htmlTemplate(body: string) {
	return `<!DOCTYPE HTML>
	<html lang="en">
		<head>
			<title>test</title>
		</head>
		<body>
			${body}
		</body>
	</html>`;
}

const activeServers: Set<http.Server> = new Set();
export function createComponentPage(name: string, testSrc: string) {
	return new Promise<number>(async (resolve) => {
		const { bundle, body, bundleName, component } = await getComponent(name, testSrc);	
		
		const app = express();
		const html = htmlTemplate(`${body}
		<script src="/js.js"></script>`);
		app.get('/', (_req, res) => {
			res.write(html);
			res.end();
		});
		const js = `${bundle}; 
		${bundleName}.${component.name}.define();`;
		app.get('/js.js', (_req, res) => {
			res.write(js);
			res.end();
		});

		const port = await getFreePort(30000, 50000);
		const server = http.createServer(app).listen(port, () => {
			resolve(port);
		});
		activeServers.add(server);
	});
}

export function clearActiveServers() {
	for (const server of activeServers.values()) {
		server.close();
	}
	activeServers.clear();
}