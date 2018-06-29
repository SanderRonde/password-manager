"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const googledrive_1 = require("./methods/googledrive");
const onedrive_1 = require("./methods/onedrive");
const dropbox_1 = require("./methods/dropbox");
const local_1 = require("./methods/local");
const load_1 = require("./methods/load");
const util_1 = require("../../lib/util");
var Backup;
(function (Backup) {
    Backup.Load = load_1.Load;
    Backup.Local = local_1.Local;
    Backup.Dropbox = dropbox_1.Dropbox;
    Backup.Onedrive = onedrive_1.Onedrive;
    Backup.GoogleDrive = googledrive_1.GoogleDrive;
    function genConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            const file = yield util_1.readFile('./config.json');
        });
    }
    Backup.genConfig = genConfig;
})(Backup = exports.Backup || (exports.Backup = {}));
