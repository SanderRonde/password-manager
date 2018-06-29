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
const commentJson = require("comment-json");
const mkdirp = require("mkdirp");
const path = require("path");
const fs = require("fs");
function readFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data.toString());
            }
        });
    });
}
exports.readFile = readFile;
function assertDir(dirPath) {
    return new Promise((resolve, reject) => {
        mkdirp(dirPath, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
exports.assertDir = assertDir;
function writeFile(filePath, data) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            yield assertDir(path.dirname(filePath)).catch((err) => {
                resolve(err);
            });
            fs.writeFile(filePath, data, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        }));
    });
}
function readJSON(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        return commentJson.parse(yield readFile(filePath));
    });
}
exports.readJSON = readJSON;
function exitWith(err) {
    console.log(err);
    return process.exit(1);
}
exports.exitWith = exitWith;
