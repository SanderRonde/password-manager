import { BackupSettings } from "../backup";
import { Export } from "../export";
import fs = require('fs-extra');
import path = require('path');


export namespace Local {
	export async function backup(config: BackupSettings) {
		const data = await Export.exportDatabase(
			config.database);
		console.log('Writing file...');
		const filePath = config.output || path.join(__dirname,
			'../../../../backup.archive');
		await fs.mkdirp(path.dirname(filePath));
		await fs.writeFile(filePath, data);
		console.log('Done writing file');
	}
}