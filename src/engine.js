const chalk = require('chalk');
const knex = require('knex');
const rmfr = require('rmfr');
const fs = require('fs');
const path = require('path');
const R = require('ramda');
const { recase } = require('@kristiandupont/recase');
const { extractSchema } = require('extract-pg-schema');
const generateFile = require('./generateFile')
const generateModelFile = require("./generateModelFile");

/**
 * @param {Table[]} tables
 */
function generateModelIndexFile(tables, modelDir, pc, fc, cc) {
  const isFixed = (m) => m.isView || m.tags['fixed'];

  const hasIdentifier = (m) =>
    R.filter((c) => c.isPrimary, m.columns).length === 1;

  const creatableModels = R.reject(isFixed, tables);
  const modelsWithIdColumn = R.filter(hasIdentifier, tables);

  const importLine = (m) => {
    const importInitializer = !isFixed(m);
    const importId = hasIdentifier(m);
    const additionalImports = importInitializer || importId;
    if (!additionalImports) {
      return `import ${pc(m.name)} from './${fc(m.name)}';`;
    } else {
      const imports = [
        ...(importInitializer ? [`${pc(m.name)}Initializer`] : []),
        ...(importId ? [`${pc(m.name)}Id`] : []),
      ];
      return `import ${pc(m.name)}, { ${imports.join(', ')} } from './${fc(
        m.name
      )}';`;
    }
  };

  const exportLine = (m) => {
    const exportInitializer = !isFixed(m);
    const exportId = hasIdentifier(m);
    const exports = [
      pc(m.name),
      ...(exportInitializer ? [`${pc(m.name)}Initializer`] : []),
      ...(exportId ? [`${pc(m.name)}Id`] : []),
    ];
    return `  ${exports.join(', ')},`;
  };

  const lines = [
    ...R.map(importLine, tables),
    '',
    'type Model =',
    ...R.map((model) => `  | ${pc(model.name)}`, tables),
    '',
    'interface ModelTypeMap {',
    ...R.map((model) => `  '${cc(model.name)}': ${pc(model.name)};`, tables),
    '}',
    '',
    'type ModelId =',
    ...R.map((model) => `  | ${pc(model.name)}Id`, modelsWithIdColumn),
    '',
    'interface ModelIdTypeMap {',
    ...R.map(
      (model) => `  '${cc(model.name)}': ${pc(model.name)}Id;`,
      modelsWithIdColumn
    ),
    '}',
    '',
    'type Initializer =',
    ...R.map((model) => `  | ${pc(model.name)}Initializer`, creatableModels),
    '',
    'interface InitializerTypeMap {',
    ...R.map(
      (model) => `  '${cc(model.name)}': ${pc(model.name)}Initializer;`,
      creatableModels
    ),
    '}',
    '',
    'export {',
    ...R.map(exportLine, tables),
    '',
    '  Model,',
    '  ModelTypeMap,',
    '  ModelId,',
    '  ModelIdTypeMap,',
    '  Initializer,',
    '  InitializerTypeMap',
    '};',
  ];

  const fullPath = path.join(modelDir, 'index.ts');
  generateFile({ fullPath, lines });
}

/**
 * @param {Table[]} tables
 */
async function generateModelFiles(
  tables,
  views,
  typeMap,
  userTypes,
  modelDir,
  fromCase,
  filenameCase
) {
  const pc = recase(fromCase, 'pascal');
  const cc = recase(fromCase, 'camel');
  const fc = recase(fromCase, filenameCase);

  R.forEach(
    (table) =>
      generateModelFile(table, false, typeMap, userTypes, modelDir, pc, cc, fc),
    tables
  );

  R.forEach(
    (view) =>
      generateModelFile(view, true, typeMap, userTypes, modelDir, pc, cc, fc),
    views
  );

  generateModelIndexFile(
    [...tables, ...views.map((v) => ({ ...v, isView: true }))],
    modelDir,
    pc,
    fc,
    cc
  );
}

/**
 * @param {Type} type
 */
async function generateTypeFile(type, modelDir, fc, pc) {
  const lines = [];

  const { comment } = type;

  if (comment) {
    lines.push(`/** ${comment} */`);
  }
  lines.push(
    `type ${pc(type.name)} = ${R.map((v) => `'${v}'`, type.values).join(
      ' | '
    )};`
  );
  lines.push(`export default ${pc(type.name)};`);

  const filename = `${fc(type.name)}.ts`;
  const fullPath = path.join(modelDir, filename);
  generateFile({ fullPath, lines });
}

/**
 * @param {Type[]} types
 */
async function generateTypeFiles(types, modelDir, fromCase, filenameCase) {
  const fc = recase(fromCase, filenameCase);
  const pc = recase(fromCase, 'pascal');

  R.forEach((t) => generateTypeFile(t, modelDir, fc, pc), types);
}

const defaultTypeMap = {
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

async function generateModels({
  connection,
  sourceCasing = 'snake',
  filenameCasing = 'pascal',
  customTypeMap = {},
  schemas,
}) {
  const typeMap = { ...defaultTypeMap, ...customTypeMap };

  console.log(
    `Connecting to ${chalk.greenBright(connection.database)} on ${
      connection.host
    }`
  );
  const knexConfig = {
    client: 'pg',
    connection,
  };
  const db = knex(knexConfig);

  for (const schema of schemas) {
    if (schema.preDeleteModelFolder) {
      console.log(` - Clearing old files in ${schema.modelFolder}`);
      await rmfr(schema.modelFolder, { glob: true });
    }
    if (!fs.existsSync(schema.modelFolder)) {
      fs.mkdirSync(schema.modelFolder);
    }

    const { tables, views, types } = await extractSchema(schema.name, db);

    await generateTypeFiles(
      types,
      schema.modelFolder,
      sourceCasing,
      filenameCasing
    );

    await generateModelFiles(
      tables,
      views,
      typeMap,
      R.pluck('name', types),
      schema.modelFolder,
      sourceCasing,
      filenameCasing
    );
  }
}

module.exports = {
  generateFile,
  generateModels,
};
