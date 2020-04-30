"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = __importDefault(require("path"));
var ramda_1 = require("ramda");
var generateFile_1 = __importDefault(require("./generateFile"));
var generateInterface_1 = __importDefault(require("./generateInterface"));
/**
 * @typedef { import('extract-pg-schema').Table } Table
 * @typedef { import('extract-pg-schema').Type } Type
 */
/**
 * @param {Table} tableOrView
 */
var generateModelFile = function (tableOrView, isView, typeMap, userTypes, modelDir, pc, cc, fc) {
    var lines = [];
    var comment = tableOrView.comment, tags = tableOrView.tags;
    var generateInitializer = !tags['fixed'] && !isView;
    var referencedIdTypes = ramda_1.uniq(ramda_1.map(function (p) { return p.parent.split('.')[0]; }, ramda_1.filter(function (p) { return !!p.parent; }, tableOrView.columns)));
    ramda_1.forEach(function (referencedIdType) {
        lines.push("import { " + pc(referencedIdType) + "Id } from './" + fc(referencedIdType) + "';");
    }, referencedIdTypes);
    if (referencedIdTypes.length) {
        lines.push('');
    }
    var appliedUserTypes = ramda_1.map(function (p) { return p.type; }, ramda_1.filter(function (p) { return userTypes.indexOf(p.type) !== -1; }, tableOrView.columns));
    ramda_1.forEach(function (importedType) {
        lines.push("import " + pc(importedType) + " from './" + fc(importedType) + "';");
    }, appliedUserTypes);
    if (appliedUserTypes.length) {
        lines.push('');
    }
    var overriddenTypes = ramda_1.map(function (p) { return p.tags.type; }, ramda_1.filter(function (p) { return !!p.tags.type; }, tableOrView.columns));
    ramda_1.forEach(function (importedType) {
        lines.push("import " + pc(importedType) + " from '../" + fc(importedType) + "';");
    }, overriddenTypes);
    if (overriddenTypes.length) {
        lines.push('');
    }
    var primaryColumns = ramda_1.filter(function (c) { return c.isPrimary; }, tableOrView.columns);
    // If there's one and only one primary key, that's the identifier.
    var hasIdentifier = primaryColumns.length === 1;
    var columns = ramda_1.map(function (c) { return (__assign(__assign({}, c), { isIdentifier: hasIdentifier && c.isPrimary })); }, tableOrView.columns);
    if (hasIdentifier) {
        var _a = primaryColumns[0], type = _a.type, tags_1 = _a.tags;
        var innerType = tags_1.type || typeMap[type] || pc(type);
        lines.push("export type " + pc(tableOrView.name) + "Id = " + innerType + " & { __flavor?: '" + tableOrView.name + "' };");
        lines.push('');
    }
    var interfaceLines = generateInterface_1.default({
        name: tableOrView.name,
        properties: columns,
        considerDefaultValues: false,
        comment: comment,
        exportAs: 'default',
    }, typeMap, pc, cc);
    lines.push.apply(lines, interfaceLines);
    if (generateInitializer) {
        lines.push('');
        var initializerInterfaceLines = generateInterface_1.default({
            name: pc(tableOrView.name) + "Initializer",
            modelName: tableOrView.name,
            properties: ramda_1.reject(ramda_1.propEq('name', 'createdAt'), columns),
            considerDefaultValues: true,
            comment: comment,
            exportAs: true,
        }, typeMap, pc, cc);
        lines.push.apply(lines, initializerInterfaceLines);
    }
    var filename = fc(tableOrView.name) + ".ts";
    var fullPath = path_1.default.join(modelDir, filename);
    generateFile_1.default({ fullPath: fullPath, lines: lines });
};
exports.default = generateModelFile;
