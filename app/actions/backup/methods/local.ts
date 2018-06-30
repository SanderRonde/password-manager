import { writeFile } from "../../../lib/util";
import { BackupSettings } from "../backup";
import { Export } from "../export";
import path = require('path');


export namespace Local {
	export async function backup(config: BackupSettings) {
		const data = await Export.exportDatabase(
			config.database, config.password);
		console.log('Writing file...');
		await writeFile(config.output || path.join(__dirname,
			'../../../../backup.archive'), data);
	}
}