"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var ramda_1 = require("ramda");
var generateProperty = function (considerDefaultValue, modelName, typeMap, pc) { return function (_a) {
    var name = _a.name, type = _a.type, nullable = _a.nullable, isIdentifier = _a.isIdentifier, parent = _a.parent, defaultValue = _a.defaultValue, indices = _a.indices, comment = _a.comment, tags = _a.tags;
    var lines = [];
    var idType;
    var commentLines = comment ? [comment] : [];
    if (isIdentifier) {
        idType = pc(modelName) + "Id";
    }
    else if (parent) {
        idType = pc(parent.split('.')[0]) + "Id";
    }
    if (defaultValue && considerDefaultValue) {
        commentLines.push("Default value: " + defaultValue);
    }
    ramda_1.forEach(function (index) {
        if (index.isPrimary) {
            commentLines.push("Primary key. Index: " + index.name);
        }
        else {
            commentLines.push("Index: " + index.name);
        }
    }, indices);
    if (commentLines.length === 1) {
        lines.push("  /** " + commentLines[0] + " */");
    }
    else if (commentLines.length > 1) {
        lines.push('  /**');
        lines.push.apply(lines, ramda_1.map(function (c) { return "   * " + c; }, commentLines));
        lines.push('  */');
    }
    var optional = considerDefaultValue && (defaultValue || nullable);
    var varName = optional ? name + "?" : name;
    var rawType = tags.type || idType || typeMap[type] || pc(type);
    var typeStr = nullable && !considerDefaultValue ? rawType + " | null" : rawType;
    lines.push("  " + varName + ": " + typeStr + ";");
    return lines;
}; };
var generateInterface = function (_a, typeMap, pc) {
    var name = _a.name, _b = _a.modelName, modelName = _b === void 0 ? null : _b, _c = _a.baseInterface, baseInterface = _c === void 0 ? null : _c, properties = _a.properties, considerDefaultValues = _a.considerDefaultValues, comment = _a.comment, exportAs = _a.exportAs;
    var lines = [];
    if (comment) {
        lines.push('/**', " * " + comment, ' */');
    }
    var exportStr = '';
    if (exportAs) {
        exportStr = exportAs === 'default' ? 'export default ' : 'export ';
    }
    var extendsStr = baseInterface ? " extends " + baseInterface : '';
    lines.push(exportStr + "interface " + pc(name) + extendsStr + " {");
    var props = ramda_1.map(generateProperty(considerDefaultValues, modelName || name, typeMap, pc), properties);
    var propLines = ramda_1.flatten(__spreadArrays([
        ramda_1.head(props)
    ], ramda_1.map(function (p) { return __spreadArrays([''], p); }, ramda_1.tail(props))));
    lines.push.apply(lines, propLines);
    lines.push('}');
    return lines;
};
exports.default = generateInterface;
