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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var chalk = require('chalk');
var knex = require('knex');
var rmfr = require('rmfr');
var fs = require('fs');
var path = require('path');
var R = require('ramda');
var recase = require('@kristiandupont/recase').recase;
var extractSchema = require('extract-pg-schema').extractSchema;
var generateFile = require('./generateFile');
var generateModelFile = require("./generateModelFile");
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
/**
 * @param {Table[]} tables
 */
function generateModelFiles(tables, views, typeMap, userTypes, modelDir, fromCase, filenameCase) {
    return __awaiter(this, void 0, void 0, function () {
        var pc, cc, fc;
        return __generator(this, function (_a) {
            pc = recase(fromCase, 'pascal');
            cc = recase(fromCase, 'camel');
            fc = recase(fromCase, filenameCase);
            R.forEach(function (table) {
                return generateModelFile(table, false, typeMap, userTypes, modelDir, pc, cc, fc);
            }, tables);
            R.forEach(function (view) {
                return generateModelFile(view, true, typeMap, userTypes, modelDir, pc, cc, fc);
            }, views);
            generateModelIndexFile(__spreadArrays(tables, views.map(function (v) { return (__assign(__assign({}, v), { isView: true })); })), modelDir, pc, fc, cc);
            return [2 /*return*/];
        });
    });
}
/**
 * @param {Type} type
 */
function generateTypeFile(type, modelDir, fc, pc) {
    return __awaiter(this, void 0, void 0, function () {
        var lines, comment, filename, fullPath;
        return __generator(this, function (_a) {
            lines = [];
            comment = type.comment;
            if (comment) {
                lines.push("/** " + comment + " */");
            }
            lines.push("type " + pc(type.name) + " = " + R.map(function (v) { return "'" + v + "'"; }, type.values).join(' | ') + ";");
            lines.push("export default " + pc(type.name) + ";");
            filename = fc(type.name) + ".ts";
            fullPath = path.join(modelDir, filename);
            generateFile({ fullPath: fullPath, lines: lines });
            return [2 /*return*/];
        });
    });
}
/**
 * @param {Type[]} types
 */
function generateTypeFiles(types, modelDir, fromCase, filenameCase) {
    return __awaiter(this, void 0, void 0, function () {
        var fc, pc;
        return __generator(this, function (_a) {
            fc = recase(fromCase, filenameCase);
            pc = recase(fromCase, 'pascal');
            R.forEach(function (t) { return generateTypeFile(t, modelDir, fc, pc); }, types);
            return [2 /*return*/];
        });
    });
}
var defaultTypeMap = {
    int2: 'number',
    int4: 'number',
    float4: 'number',
    numeric: 'number',
    bool: 'boolean',
    json: 'unknown',
    jsonb: 'unknown',
    char: 'string',
    varchar: 'string',
    text: 'string',
    date: 'Date',
    time: 'Date',
    timetz: 'Date',
    timestamp: 'Date',
    timestamptz: 'Date',
};
function generateModels(_a) {
    var connection = _a.connection, _b = _a.sourceCasing, sourceCasing = _b === void 0 ? 'snake' : _b, _c = _a.filenameCasing, filenameCasing = _c === void 0 ? 'pascal' : _c, _d = _a.customTypeMap, customTypeMap = _d === void 0 ? {} : _d, schemas = _a.schemas;
    return __awaiter(this, void 0, void 0, function () {
        var typeMap, knexConfig, db, _i, schemas_1, schema, _e, tables, views, types;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    typeMap = __assign(__assign({}, defaultTypeMap), customTypeMap);
                    console.log("Connecting to " + chalk.greenBright(connection.database) + " on " + connection.host);
                    knexConfig = {
                        client: 'pg',
                        connection: connection,
                    };
                    db = knex(knexConfig);
                    _i = 0, schemas_1 = schemas;
                    _f.label = 1;
                case 1:
                    if (!(_i < schemas_1.length)) return [3 /*break*/, 8];
                    schema = schemas_1[_i];
                    if (!schema.preDeleteModelFolder) return [3 /*break*/, 3];
                    console.log(" - Clearing old files in " + schema.modelFolder);
                    return [4 /*yield*/, rmfr(schema.modelFolder, { glob: true })];
                case 2:
                    _f.sent();
                    _f.label = 3;
                case 3:
                    if (!fs.existsSync(schema.modelFolder)) {
                        fs.mkdirSync(schema.modelFolder);
                    }
                    return [4 /*yield*/, extractSchema(schema.name, db)];
                case 4:
                    _e = _f.sent(), tables = _e.tables, views = _e.views, types = _e.types;
                    return [4 /*yield*/, generateTypeFiles(types, schema.modelFolder, sourceCasing, filenameCasing)];
                case 5:
                    _f.sent();
                    return [4 /*yield*/, generateModelFiles(tables, views, typeMap, R.pluck('name', types), schema.modelFolder, sourceCasing, filenameCasing)];
                case 6:
                    _f.sent();
                    _f.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 1];
                case 8: return [2 /*return*/];
            }
        });
    });
}
module.exports = {
    generateFile: generateFile,
    generateModels: generateModels,
};
