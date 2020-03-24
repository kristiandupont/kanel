const chalk = require('chalk');
const knex = require('knex');
const rmfr = require('rmfr');
const fs = require('fs');
const path = require('path');
const R = require('ramda');
const { recase } = require('@kristiandupont/recase');
const { extractSchema } = require('extract-pg-schema');
const generateFile = require('./generateFile')

/**
 * @typedef { import('extract-pg-schema').Table } Table
 * @typedef { import('extract-pg-schema').Type } Type
 */

const generateProperty = (
  considerDefaultValue,
  modelName,
  typeMap,
  pc,
  cc
) => ({
  name,
  type,
  nullable,
  isIdentifier,
  parent,
  defaultValue,
  indices,
  comment,
  tags,
}) => {
  const lines = [];

  let idType;

  const commentLines = comment ? [comment] : [];
  if (isIdentifier) {
    idType = `${pc(modelName)}Id`;
  } else if (parent) {
    idType = `${pc(parent.split('.')[0])}Id`;
  }
  if (defaultValue && considerDefaultValue) {
    commentLines.push(`Default value: ${defaultValue}`);
  }
  R.forEach((index) => {
    if (index.isPrimary) {
      commentLines.push(`Primary key. Index: ${index.name}`);
    } else {
      commentLines.push(`Index: ${index.name}`);
    }
  }, indices);

  if (commentLines.length === 1) {
    lines.push(`  /** ${commentLines[0]} */`);
  } else if (commentLines.length > 1) {
    lines.push('  /**');
    lines.push(...R.map((c) => `   * ${c}`, commentLines));
    lines.push('  */');
  }
  const optional = considerDefaultValue && (defaultValue || nullable);
  const varName = optional ? `${cc(name)}?` : cc(name);

  const rawType = tags.type || idType || typeMap[type] || pc(type);
  const typeStr =
    nullable && !considerDefaultValue ? `${rawType} | null` : rawType;
  lines.push(`  ${varName}: ${typeStr};`);

  return lines;
};

function generateInterface(
  {
    name,
    modelName = null,
    baseInterface = null,
    properties,
    considerDefaultValues,
    comment,
    exportAs,
  },
  typeMap,
  pc,
  cc
) {
  const lines = [];

  if (comment) {
    lines.push('/**', ` * ${comment}`, ' */');
  }

  let exportStr = '';
  if (exportAs) {
    exportStr = exportAs === 'default' ? 'export default ' : 'export ';
  }

  const extendsStr = baseInterface ? `extends ${baseInterface}` : '';
  lines.push(`${exportStr}interface ${pc(name)} ${extendsStr} {`);
  const props = R.map(
    generateProperty(considerDefaultValues, modelName || name, typeMap, pc, cc),
    properties
  );
  const propLines = R.flatten([
    R.head(props),
    // @ts-ignore
    ...R.map((p) => ['', ...p], R.tail(props)),
  ]);
  lines.push(...propLines);
  lines.push('}');

  return lines;
}

/**
 * @param {Table} tableOrView
 */
function generateModelFile(
  tableOrView,
  isView,
  typeMap,
  userTypes,
  modelDir,
  pc,
  cc,
  fc
) {
  const lines = [];

  const { comment, tags } = tableOrView;
  const generateInitializer = !tags['fixed'] && !isView;

  const referencedIdTypes = R.uniq(
    R.map(
      (p) => p.parent.split('.')[0],
      R.filter((p) => !!p.parent, tableOrView.columns)
    )
  );
  R.forEach((referencedIdType) => {
    lines.push(
      `import { ${pc(referencedIdType)}Id } from './${fc(referencedIdType)}';`
    );
  }, referencedIdTypes);
  if (referencedIdTypes.length) {
    lines.push('');
  }

  const appliedUserTypes = R.map(
    (p) => p.type,
    R.filter((p) => userTypes.indexOf(p.type) !== -1, tableOrView.columns)
  );
  R.forEach((importedType) => {
    lines.push(`import ${pc(importedType)} from './${fc(importedType)}';`);
  }, appliedUserTypes);
  if (appliedUserTypes.length) {
    lines.push('');
  }

  const overriddenTypes = R.map(
    (p) => p.tags.type,
    R.filter((p) => !!p.tags.type, tableOrView.columns)
  );
  R.forEach((importedType) => {
    lines.push(`import ${pc(importedType)} from '../${fc(importedType)}';`);
  }, overriddenTypes);
  if (overriddenTypes.length) {
    lines.push('');
  }

  // If there's one and only one primary key, that's the identifier.
  const hasIdentifier =
    R.filter((c) => c.isPrimary, tableOrView.columns).length === 1;

  const columns = R.map(
    (c) => ({
      ...c,
      isIdentifier: hasIdentifier && c.isPrimary,
    }),
    tableOrView.columns
  );

  if (hasIdentifier) {
    lines.push(
      `export type ${pc(tableOrView.name)}Id = number & { __flavor?: '${
        tableOrView.name
      }' };`
    );
    lines.push('');
  }

  const interfaceLines = generateInterface(
    {
      name: tableOrView.name,
      properties: columns,
      considerDefaultValues: false,
      comment,
      exportAs: 'default',
    },
    typeMap,
    pc,
    cc
  );
  lines.push(...interfaceLines);

  if (generateInitializer) {
    lines.push('');
    const initializerInterfaceLines = generateInterface(
      {
        name: `${pc(tableOrView.name)}Initializer`,
        modelName: tableOrView.name,
        properties: R.reject(R.propEq('name', 'createdAt'), columns),
        considerDefaultValues: true,
        comment,
        exportAs: true,
      },
      typeMap,
      pc,
      cc
    );
    lines.push(...initializerInterfaceLines);
  }

  const filename = `${fc(tableOrView.name)}.ts`;
  const fullPath = path.join(modelDir, filename);
  generateFile({ fullPath, lines });
}

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
