import { writeFile } from "../../../lib/util";
import { BackupSettings } from "../backup";
import { Export } from "../export";
import path = require('path');
import { Log } from "../../../main";


export namespace Local {
	export async function backup(log: Log, config: BackupSettings) {
		const data = await Export.exportDatabase(log,
			config.database, config.password);
		log.write('Writing file...');
		await writeFile(config.output || path.join(__dirname,
			'../../../../backup.archive'), data);
	}
}