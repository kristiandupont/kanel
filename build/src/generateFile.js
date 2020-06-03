"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var os_1 = __importDefault(require("os"));
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
var generateFile = function (_a) {
    var fullPath = _a.fullPath, lines = _a.lines;
    var relativePath = path_1.default.relative(process.cwd(), fullPath);
    console.log(" - " + relativePath);
    var allLines = __spreadArrays([
        "// Automatically generated. Don't change this file manually.",
        ''
    ], lines, [
        '',
    ]);
    var content = allLines.join(os_1.default.EOL);
    fs_1.default.writeFileSync(fullPath, content, 'utf-8');
};
exports.default = generateFile;
