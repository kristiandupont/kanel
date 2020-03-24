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
var path = require('path');
var R = require('ramda');
var generateFile = require('./generateFile');
var generateInterface = require('./generateInterface');
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
    var referencedIdTypes = R.uniq(R.map(function (p) { return p.parent.split('.')[0]; }, R.filter(function (p) { return !!p.parent; }, tableOrView.columns)));
    R.forEach(function (referencedIdType) {
        lines.push("import { " + pc(referencedIdType) + "Id } from './" + fc(referencedIdType) + "';");
    }, referencedIdTypes);
    if (referencedIdTypes.length) {
        lines.push('');
    }
    var appliedUserTypes = R.map(function (p) { return p.type; }, R.filter(function (p) { return userTypes.indexOf(p.type) !== -1; }, tableOrView.columns));
    R.forEach(function (importedType) {
        lines.push("import " + pc(importedType) + " from './" + fc(importedType) + "';");
    }, appliedUserTypes);
    if (appliedUserTypes.length) {
        lines.push('');
    }
    var overriddenTypes = R.map(function (p) { return p.tags.type; }, R.filter(function (p) { return !!p.tags.type; }, tableOrView.columns));
    R.forEach(function (importedType) {
        lines.push("import " + pc(importedType) + " from '../" + fc(importedType) + "';");
    }, overriddenTypes);
    if (overriddenTypes.length) {
        lines.push('');
    }
    // If there's one and only one primary key, that's the identifier.
    var hasIdentifier = R.filter(function (c) { return c.isPrimary; }, tableOrView.columns).length === 1;
    var columns = R.map(function (c) { return (__assign(__assign({}, c), { isIdentifier: hasIdentifier && c.isPrimary })); }, tableOrView.columns);
    if (hasIdentifier) {
        lines.push("export type " + pc(tableOrView.name) + "Id = number & { __flavor?: '" + tableOrView.name + "' };");
        lines.push('');
    }
    var interfaceLines = generateInterface({
        name: tableOrView.name,
        properties: columns,
        considerDefaultValues: false,
        comment: comment,
        exportAs: 'default',
    }, typeMap, pc, cc);
    lines.push.apply(lines, interfaceLines);
    if (generateInitializer) {
        lines.push('');
        var initializerInterfaceLines = generateInterface({
            name: pc(tableOrView.name) + "Initializer",
            modelName: tableOrView.name,
            properties: R.reject(R.propEq('name', 'createdAt'), columns),
            considerDefaultValues: true,
            comment: comment,
            exportAs: true,
        }, typeMap, pc, cc);
        lines.push.apply(lines, initializerInterfaceLines);
    }
    var filename = fc(tableOrView.name) + ".ts";
    var fullPath = path.join(modelDir, filename);
    generateFile({ fullPath: fullPath, lines: lines });
};
module.exports = generateModelFile;
