import { writeBuffer } from "../../../lib/util";
import { BackupSettings } from "../backup";
import { Export } from "../export";
import path = require('path');


export namespace Local {
	export async function backup(config: BackupSettings) {
		const data = await Export.exportDatabase(
			config.database);
		console.log('Writing file...');
		await writeBuffer(config.output || path.join(__dirname,
			'../../../../backup.archive'), data);
		console.log('Done writing file');
	}
}