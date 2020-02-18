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
var os = require('os');
var R = require('ramda');
var recase = require('@kristiandupont/recase').recase;
var extractSchema = require('extract-pg-schema').extractSchema;
/**
 * @typedef { import('extract-pg-schema').Table } Table
 * @typedef { import('extract-pg-schema').Type } Type
 */
var generateFile = function (_a) {
    var fullPath = _a.fullPath, lines = _a.lines;
    var packageDir = path.join(__dirname, '..');
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
var getMappedType = function (type) {
    var typeMap = {
        int4: 'number',
        bool: 'boolean',
        jsonb: 'unknown',
        text: 'string',
        timestamptz: 'Date',
    };
    return typeMap[type];
};
var generateProperty = function (considerDefaultValue, modelName, pc, cc) { return function (_a) {
    var name = _a.name, type = _a.type, nullable = _a.nullable, parent = _a.parent, defaultValue = _a.defaultValue, indices = _a.indices, comment = _a.comment, tags = _a.tags;
    var lines = [];
    var idType;
    var commentLines = comment ? [comment] : [];
    if (parent) {
        idType = pc(parent.split('.')[0]) + "Id";
    }
    if (defaultValue && considerDefaultValue) {
        commentLines.push("Default value: " + defaultValue);
    }
    R.forEach(function (index) {
        if (index.isPrimary) {
            if (name === 'id') {
                idType = pc(modelName) + "Id";
            }
            else {
                commentLines.push("Primary key. Index: " + index.name);
            }
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
        lines.push.apply(lines, R.map(function (c) { return "   * " + c; }, commentLines));
        lines.push('  */');
    }
    var optional = considerDefaultValue && (defaultValue || nullable);
    var varName = optional ? cc(name) + "?" : name;
    var rawType = tags.type || idType || getMappedType(type) || type;
    var typeStr = nullable && !considerDefaultValue ? rawType + " |\u00A0null" : rawType;
    // const typeStr = tags.type || idType || generateType({ type, nullable: nullable && !considerDefaultValue, name });
    lines.push("  " + varName + ": " + typeStr + ";");
    return lines;
}; };
function generateInterface(_a, pc, cc) {
    var name = _a.name, _b = _a.modelName, modelName = _b === void 0 ? null : _b, _c = _a.baseInterface, baseInterface = _c === void 0 ? null : _c, properties = _a.properties, considerDefaultValues = _a.considerDefaultValues, comment = _a.comment, exportAs = _a.exportAs;
    var lines = [];
    if (comment) {
        lines.push('/**', " * " + comment, ' */');
    }
    var exportStr = '';
    if (exportAs) {
        exportStr = exportAs === 'default' ? 'export default ' : 'export ';
    }
    var extendsStr = baseInterface ? "extends " + baseInterface : '';
    lines.push(exportStr + "interface " + pc(name) + " " + extendsStr + " {");
    var props = R.map(generateProperty(considerDefaultValues, modelName || name, pc, cc), properties);
    var propLines = R.flatten(__spreadArrays([
        R.head(props)
    ], R.map(function (p) { return __spreadArrays([''], p); }, R.tail(props))));
    lines.push.apply(lines, propLines);
    lines.push('}');
    return lines;
}
/**
 * @param {Table} model
 */
function generateModelFile(model, userTypes, modelDir, pc, cc, fc) {
    var lines = [];
    var comment = model.comment, tags = model.tags;
    var generateInitializer = !tags['fixed'];
    var referencedIdTypes = R.uniq(R.map(function (p) { return p.parent.split('.')[0]; }, R.filter(function (p) { return !!p.parent; }, model.columns)));
    R.forEach(function (referencedIdType) {
        lines.push("import { " + pc(referencedIdType) + "Id } from './" + fc(referencedIdType) + "';");
    }, referencedIdTypes);
    if (referencedIdTypes.length) {
        lines.push('');
    }
    var appliedUserTypes = R.map(function (p) { return p.type; }, R.filter(function (p) { return userTypes.indexOf(p.type) !== -1; }, model.columns));
    R.forEach(function (importedType) {
        lines.push("import " + importedType + " from './" + fc(importedType) + "';");
    }, appliedUserTypes);
    if (appliedUserTypes.length) {
        lines.push('');
    }
    var overriddenTypes = R.map(function (p) { return p.tags.type; }, R.filter(function (p) { return !!p.tags.type; }, model.columns));
    R.forEach(function (importedType) {
        lines.push("import " + importedType + " from '../" + fc(importedType) + "';");
    }, overriddenTypes);
    if (overriddenTypes.length) {
        lines.push('');
    }
    if (R.any(function (p) { return p.name === 'id'; }, model.columns)) {
        lines.push("export type " + pc(model.name) + "Id = number & { __flavor?: '" + model.name + "' };");
        lines.push('');
    }
    var interfaceLines = generateInterface({
        name: model.name,
        properties: model.columns,
        considerDefaultValues: false,
        comment: comment,
        exportAs: 'default',
    }, pc, cc);
    lines.push.apply(lines, interfaceLines);
    if (generateInitializer) {
        lines.push('');
        var initializerInterfaceLines = generateInterface({
            name: pc(model.name) + "Initializer",
            modelName: model.name,
            properties: R.reject(R.propEq('name', 'createdAt'), model.columns),
            considerDefaultValues: true,
            comment: comment,
            exportAs: true,
        }, pc, cc);
        lines.push.apply(lines, initializerInterfaceLines);
    }
    var filename = fc(model.name) + ".ts";
    var fullPath = path.join(modelDir, filename);
    generateFile({ fullPath: fullPath, lines: lines });
}
/**
 * @param {Table[]} models
 */
function generateModelIndexFile(models, modelDir, pc, fc, cc) {
    var isFixed = function (m) { return m.tags['fixed']; };
    var hasIdColumn = function (m) { return R.any(function (p) { return p.name === 'id'; }, m.columns); };
    var creatableModels = R.reject(isFixed, models);
    var modelsWithIdColumn = R.filter(hasIdColumn, models);
    var importLine = function (m) {
        var importInitializer = !isFixed(m);
        var importId = hasIdColumn(m);
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
        var exportId = hasIdColumn(m);
        var exports = __spreadArrays([
            pc(m.name)
        ], (exportInitializer ? [pc(m.name) + "Initializer"] : []), (exportId ? [pc(m.name) + "Id"] : []));
        return "  " + exports.join(', ') + ",";
    };
    var lines = __spreadArrays(R.map(importLine, models), [
        '',
        'type Model ='
    ], R.map(function (model) { return "  | " + pc(model.name); }, models), [
        '',
        'interface ModelTypeMap {'
    ], R.map(function (model) { return "  '" + cc(model.name) + "': " + pc(model.name) + ";"; }, models), [
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
    ], R.map(exportLine, models), [
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
 * @param {Table[]} models
 */
function generateModelFiles(models, userTypes, modelDir, fromCase, filenameCase) {
    return __awaiter(this, void 0, void 0, function () {
        var pc, cc, fc;
        return __generator(this, function (_a) {
            pc = recase(fromCase, 'pascal');
            cc = recase(fromCase, 'camel');
            fc = recase(fromCase, filenameCase);
            R.forEach(function (model) { return generateModelFile(model, userTypes, modelDir, pc, cc, fc); }, models);
            generateModelIndexFile(models, modelDir, pc, fc, cc);
            return [2 /*return*/];
        });
    });
}
/**
 * @param {Type} type
 */
function generateTypeFile(type, modelDir, fc) {
    return __awaiter(this, void 0, void 0, function () {
        var lines, comment, filename, fullPath;
        return __generator(this, function (_a) {
            lines = [];
            comment = type.comment;
            if (comment) {
                lines.push("/** " + comment + " */");
            }
            lines.push("type " + type.name + " = " + R.map(function (v) { return "'" + v + "'"; }, type.values).join(' | ') + ";");
            lines.push("export default " + type.name + ";");
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
        var fc;
        return __generator(this, function (_a) {
            fc = recase(fromCase, filenameCase);
            R.forEach(function (t) { return generateTypeFile(t, modelDir, fc); }, types);
            return [2 /*return*/];
        });
    });
}
function generateSchemaFiles(_a) {
    var db = _a.db, schema = _a.schema, tablesToSkip = _a.tablesToSkip, modelDir = _a.modelDir, fromCase = _a.fromCase, filenameCase = _a.filenameCase;
    return __awaiter(this, void 0, void 0, function () {
        var _b, tables, types;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, extractSchema(schema, tablesToSkip, db)];
                case 1:
                    _b = _c.sent(), tables = _b.tables, types = _b.types;
                    return [4 /*yield*/, generateTypeFiles(types, modelDir, fromCase, filenameCase)];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, generateModelFiles(tables, R.pluck('name', types), modelDir, fromCase, filenameCase)];
                case 3:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function generateModels(_a) {
    var connection = _a.connection, sourceCasing = _a.sourceCasing, filenameCasing = _a.filenameCasing, schemas = _a.schemas;
    return __awaiter(this, void 0, void 0, function () {
        var knexConfig, db, fromCase, filenameCase, _i, schemas_1, schema;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("Connecting to " + chalk.greenBright(connection.database) + " on " + connection.host);
                    knexConfig = {
                        client: 'pg',
                        connection: connection,
                    };
                    db = knex(knexConfig);
                    fromCase = sourceCasing;
                    filenameCase = filenameCasing;
                    _i = 0, schemas_1 = schemas;
                    _b.label = 1;
                case 1:
                    if (!(_i < schemas_1.length)) return [3 /*break*/, 5];
                    schema = schemas_1[_i];
                    console.log(" - Clearing old files in " + schema.modelFolder);
                    return [4 /*yield*/, rmfr(schema.modelFolder, { glob: true })];
                case 2:
                    _b.sent();
                    fs.mkdirSync(schema.modelFolder);
                    return [4 /*yield*/, generateSchemaFiles({
                            db: db,
                            schema: schema.name,
                            tablesToSkip: schema.tablesToIgnore,
                            modelDir: schema.modelFolder,
                            fromCase: fromCase,
                            filenameCase: filenameCase,
                        })];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/];
            }
        });
    });
}
module.exports = {
    generateFile: generateFile,
    generateModels: generateModels,
};
