var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var path = require('path');
var R = require('ramda');
var generateFile = require('./generateFile');
/**
 * @param {Table[]} tables
 */
function generateModelIndexFile(tables, modelDir, pc, fc, cc) {
    var isFixed = function (m) { return m.isView || m.tags['fixed']; };
    var hasIdentifier = function (m) {
        return R.filter(function (c) { return c.isPrimary; }, m.columns).length === 1;
    };
    var creatableModels = R.reject(isFixed, tables);
    var modelsWithIdColumn = R.filter(hasIdentifier, tables);
    var importLine = function (m) {
        var importInitializer = !isFixed(m);
        var importId = hasIdentifier(m);
        var additionalImports = importInitializer || importId;
        if (!additionalImports) {
            return "import " + pc(m.name) + " from './" + fc(m.name) + "';";
        }
        else {
            var imports = __spreadArrays((importInitializer ? [pc(m.name) + "Initializer"] : []), (importId ? [pc(m.name) + "Id"] : []));
            return "import " + pc(m.name) + ", { " + imports.join(', ') + " } from './" + fc(m.name) + "';";
        }
    };
    var exportLine = function (m) {
        var exportInitializer = !isFixed(m);
        var exportId = hasIdentifier(m);
        var exports = __spreadArrays([
            pc(m.name)
        ], (exportInitializer ? [pc(m.name) + "Initializer"] : []), (exportId ? [pc(m.name) + "Id"] : []));
        return "  " + exports.join(', ') + ",";
    };
    var lines = __spreadArrays(R.map(importLine, tables), [
        '',
        'type Model ='
    ], R.map(function (model) { return "  | " + pc(model.name); }, tables), [
        '',
        'interface ModelTypeMap {'
    ], R.map(function (model) { return "  '" + cc(model.name) + "': " + pc(model.name) + ";"; }, tables), [
        '}',
        '',
        'type ModelId ='
    ], R.map(function (model) { return "  | " + pc(model.name) + "Id"; }, modelsWithIdColumn), [
        '',
        'interface ModelIdTypeMap {'
    ], R.map(function (model) { return "  '" + cc(model.name) + "': " + pc(model.name) + "Id;"; }, modelsWithIdColumn), [
        '}',
        '',
        'type Initializer ='
    ], R.map(function (model) { return "  | " + pc(model.name) + "Initializer"; }, creatableModels), [
        '',
        'interface InitializerTypeMap {'
    ], R.map(function (model) { return "  '" + cc(model.name) + "': " + pc(model.name) + "Initializer;"; }, creatableModels), [
        '}',
        '',
        'export {'
    ], R.map(exportLine, tables), [
        '',
        '  Model,',
        '  ModelTypeMap,',
        '  ModelId,',
        '  ModelIdTypeMap,',
        '  Initializer,',
        '  InitializerTypeMap',
        '};',
    ]);
    var fullPath = path.join(modelDir, 'index.ts');
    generateFile({ fullPath: fullPath, lines: lines });
}
module.exports = generateModelIndexFile;
