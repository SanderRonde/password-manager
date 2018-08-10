import { PROJECT_ROOT } from "../../../../../lib/constants";
import { requireES6File } from "../../../../../lib/util";
import * as path from 'path';

export class Cache {
	async warmup() {
		await requireES6File(path.join(PROJECT_ROOT,
			'shared/components/theming/theme/theme.js'));
	}
}