var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var os = require('os');
var path = require('path');
var fs = require('fs');
var generateFile = function (_a) {
    var fullPath = _a.fullPath, lines = _a.lines;
    var relativePath = path.relative(process.cwd(), fullPath);
    console.log(" - " + relativePath);
    var allLines = __spreadArrays([
        "// Automatically generated. Don't change this file manually.",
        ''
    ], lines, [
        '',
    ]);
    var content = allLines.join(os.EOL);
    fs.writeFileSync(fullPath, content, 'utf-8');
};
module.exports = generateFile;
