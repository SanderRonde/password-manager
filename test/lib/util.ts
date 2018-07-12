import { MainExports } from "../../app/main";
import importFresh = require('import-fresh');

export function getFreshMain(): MainExports {
	return importFresh('../../app/main');
}