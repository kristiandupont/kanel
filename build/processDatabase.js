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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var chalk_1 = __importDefault(require("chalk"));
var knex_1 = __importDefault(require("knex"));
var rmfr_1 = __importDefault(require("rmfr"));
var fs_1 = __importDefault(require("fs"));
var ramda_1 = require("ramda");
var extract_pg_schema_1 = require("extract-pg-schema");
var recase_1 = require("@kristiandupont/recase");
var generateModelFile_1 = __importDefault(require("./generateModelFile"));
var generateTypeFile_1 = __importDefault(require("./generateTypeFile"));
var generateIndexFile_1 = __importDefault(require("./generateIndexFile"));
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
var processDatabase = function (_a) {
    var connection = _a.connection, _b = _a.sourceCasing, sourceCasing = _b === void 0 ? 'snake' : _b, _c = _a.filenameCasing, filenameCasing = _c === void 0 ? 'pascal' : _c, _d = _a.preDeleteModelFolder, preDeleteModelFolder = _d === void 0 ? false : _d, _e = _a.customTypeMap, customTypeMap = _e === void 0 ? {} : _e, schemas = _a.schemas;
    return __awaiter(void 0, void 0, void 0, function () {
        var typeMap, knexConfig, db, _loop_1, _i, schemas_1, schema;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    typeMap = __assign(__assign({}, defaultTypeMap), customTypeMap);
                    console.log("Connecting to " + chalk_1.default.greenBright(connection.database) + " on " + connection.host);
                    knexConfig = {
                        client: 'pg',
                        connection: connection,
                    };
                    db = knex_1.default(knexConfig);
                    _loop_1 = function (schema) {
                        var pc, cc, fc, _a, tables, views, types, rejectIgnored, includedTables, includedViews, userTypes;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    if (!preDeleteModelFolder) return [3 /*break*/, 2];
                                    console.log(" - Clearing old files in " + schema.modelFolder);
                                    return [4 /*yield*/, rmfr_1.default(schema.modelFolder, { glob: true })];
                                case 1:
                                    _b.sent();
                                    _b.label = 2;
                                case 2:
                                    if (!fs_1.default.existsSync(schema.modelFolder)) {
                                        fs_1.default.mkdirSync(schema.modelFolder);
                                    }
                                    pc = recase_1.recase(sourceCasing, 'pascal');
                                    cc = recase_1.recase(sourceCasing, 'camel');
                                    fc = recase_1.recase(sourceCasing, filenameCasing);
                                    return [4 /*yield*/, extract_pg_schema_1.extractSchema(schema.name, db)];
                                case 3:
                                    _a = _b.sent(), tables = _a.tables, views = _a.views, types = _a.types;
                                    rejectIgnored = ramda_1.reject(function (m) { return (schema.ignore || []).includes(m.name); });
                                    includedTables = rejectIgnored(tables);
                                    includedViews = rejectIgnored(views).map(function (v) { return (__assign(__assign({}, v), { isView: true })); });
                                    types.forEach(function (t) { return generateTypeFile_1.default(t, schema.modelFolder, fc, pc); });
                                    userTypes = ramda_1.pluck('name', types);
                                    includedTables.forEach(function (t) {
                                        return generateModelFile_1.default(t, typeMap, userTypes, schema.modelFolder, pc, cc, fc);
                                    });
                                    includedViews.forEach(function (v) {
                                        return generateModelFile_1.default(v, typeMap, userTypes, schema.modelFolder, pc, cc, fc);
                                    });
                                    generateIndexFile_1.default(__spreadArrays(includedTables, includedViews), schema.modelFolder, pc, cc, fc);
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, schemas_1 = schemas;
                    _f.label = 1;
                case 1:
                    if (!(_i < schemas_1.length)) return [3 /*break*/, 4];
                    schema = schemas_1[_i];
                    return [5 /*yield**/, _loop_1(schema)];
                case 2:
                    _f.sent();
                    _f.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
};
exports.default = processDatabase;
