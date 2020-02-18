const chalk = require('chalk');
const knex = require('knex');
const rmfr = require('rmfr');
const fs = require('fs');
const path = require('path');
const os = require('os');
const R = require('ramda');
const { recase } = require('@kristiandupont/recase');
const { extractSchema } = require('extract-pg-schema');

/**
 * @typedef { import('extract-pg-schema').Table } Table
 * @typedef { import('extract-pg-schema').Type } Type
 */

const generateFile = ({ fullPath, lines }) => {
  const relativePath = path.relative(process.cwd(), fullPath);
  console.log(` - ${relativePath}`);
  const allLines = [
    "// Automatically generated. Don't change this file manually.",
    '',
    ...lines,
    '',
  ];

  const content = allLines.join(os.EOL);
  fs.writeFileSync(fullPath, content, 'utf-8');
};

const getMappedType = type => {
  const typeMap = {
    int4: 'number',
    bool: 'boolean',
    jsonb: 'unknown',
    text: 'string',
    timestamptz: 'Date',
  };

  return typeMap[type];
};

const generateProperty = (considerDefaultValue, modelName, pc, cc) => ({
  name,
  type,
  nullable,
  parent,
  defaultValue,
  indices,
  comment,
  tags,
}) => {
  const lines = [];

  let idType;

  const commentLines = comment ? [comment] : [];
  if (parent) {
    idType = `${pc(parent.split('.')[0])}Id`;
  }
  if (defaultValue && considerDefaultValue) {
    commentLines.push(`Default value: ${defaultValue}`);
  }
  R.forEach(index => {
    if (index.isPrimary) {
      if (name === 'id') {
        idType = `${pc(modelName)}Id`;
      } else {
        commentLines.push(`Primary key. Index: ${index.name}`);
      }
    } else {
      commentLines.push(`Index: ${index.name}`);
    }
  }, indices);

  if (commentLines.length === 1) {
    lines.push(`  /** ${commentLines[0]} */`);
  } else if (commentLines.length > 1) {
    lines.push('  /**');
    lines.push(...R.map(c => `   * ${c}`, commentLines));
    lines.push('  */');
  }
  const optional = considerDefaultValue && (defaultValue || nullable);
  const varName = optional ? `${cc(name)}?` : name;

  const rawType = tags.type || idType || getMappedType(type) || type;
  const typeStr =
    nullable && !considerDefaultValue ? `${rawType} | null` : rawType;
  // const typeStr = tags.type || idType || generateType({ type, nullable: nullable && !considerDefaultValue, name });
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
    generateProperty(considerDefaultValues, modelName || name, pc, cc),
    properties
  );
  const propLines = R.flatten([
    R.head(props),
    // @ts-ignore
    ...R.map(p => ['', ...p], R.tail(props)),
  ]);
  lines.push(...propLines);
  lines.push('}');

  return lines;
}

/**
 * @param {Table} table
 */
function generateModelFile(table, userTypes, modelDir, pc, cc, fc) {
  const lines = [];

  const { comment, tags } = table;
  const generateInitializer = !tags['fixed'];

  const referencedIdTypes = R.uniq(
    R.map(p => p.parent.split('.')[0], R.filter(p => !!p.parent, table.columns))
  );
  R.forEach(referencedIdType => {
    lines.push(
      `import { ${pc(referencedIdType)}Id } from './${fc(referencedIdType)}';`
    );
  }, referencedIdTypes);
  if (referencedIdTypes.length) {
    lines.push('');
  }

  const appliedUserTypes = R.map(
    p => p.type,
    R.filter(p => userTypes.indexOf(p.type) !== -1, table.columns)
  );
  R.forEach(importedType => {
    lines.push(`import ${importedType} from './${fc(importedType)}';`);
  }, appliedUserTypes);
  if (appliedUserTypes.length) {
    lines.push('');
  }

  const overriddenTypes = R.map(
    p => p.tags.type,
    R.filter(p => !!p.tags.type, table.columns)
  );
  R.forEach(importedType => {
    lines.push(`import ${importedType} from '../${fc(importedType)}';`);
  }, overriddenTypes);
  if (overriddenTypes.length) {
    lines.push('');
  }

  if (R.any(p => p.name === 'id', table.columns)) {
    lines.push(
      `export type ${pc(table.name)}Id = number & { __flavor?: '${
        table.name
      }' };`
    );
    lines.push('');
  }

  const interfaceLines = generateInterface(
    {
      name: table.name,
      properties: table.columns,
      considerDefaultValues: false,
      comment,
      exportAs: 'default',
    },
    pc,
    cc
  );
  lines.push(...interfaceLines);

  if (generateInitializer) {
    lines.push('');
    const initializerInterfaceLines = generateInterface(
      {
        name: `${pc(table.name)}Initializer`,
        modelName: table.name,
        properties: R.reject(R.propEq('name', 'createdAt'), table.columns),
        considerDefaultValues: true,
        comment,
        exportAs: true,
      },
      pc,
      cc
    );
    lines.push(...initializerInterfaceLines);
  }

  const filename = `${fc(table.name)}.ts`;
  const fullPath = path.join(modelDir, filename);
  generateFile({ fullPath, lines });
}

/**
 * @param {Table[]} tables
 */
function generateModelIndexFile(tables, modelDir, pc, fc, cc) {
  const isFixed = m => m.tags['fixed'];
  const hasIdColumn = m => R.any(p => p.name === 'id', m.columns);

  const creatableModels = R.reject(isFixed, tables);
  const modelsWithIdColumn = R.filter(hasIdColumn, tables);

  const importLine = m => {
    const importInitializer = !isFixed(m);
    const importId = hasIdColumn(m);
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

  const exportLine = m => {
    const exportInitializer = !isFixed(m);
    const exportId = hasIdColumn(m);
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
    ...R.map(model => `  | ${pc(model.name)}`, tables),
    '',
    'interface ModelTypeMap {',
    ...R.map(model => `  '${cc(model.name)}': ${pc(model.name)};`, tables),
    '}',
    '',
    'type ModelId =',
    ...R.map(model => `  | ${pc(model.name)}Id`, modelsWithIdColumn),
    '',
    'interface ModelIdTypeMap {',
    ...R.map(
      model => `  '${cc(model.name)}': ${pc(model.name)}Id;`,
      modelsWithIdColumn
    ),
    '}',
    '',
    'type Initializer =',
    ...R.map(model => `  | ${pc(model.name)}Initializer`, creatableModels),
    '',
    'interface InitializerTypeMap {',
    ...R.map(
      model => `  '${cc(model.name)}': ${pc(model.name)}Initializer;`,
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
  userTypes,
  modelDir,
  fromCase,
  filenameCase
) {
  const pc = recase(fromCase, 'pascal');
  const cc = recase(fromCase, 'camel');
  const fc = recase(fromCase, filenameCase);

  R.forEach(
    table => generateModelFile(table, userTypes, modelDir, pc, cc, fc),
    tables
  );

  generateModelIndexFile(tables, modelDir, pc, fc, cc);
}

/**
 * @param {Type} type
 */
async function generateTypeFile(type, modelDir, fc) {
  const lines = [];

  const { comment } = type;

  if (comment) {
    lines.push(`/** ${comment} */`);
  }
  lines.push(
    `type ${type.name} = ${R.map(v => `'${v}'`, type.values).join(' | ')};`
  );
  lines.push(`export default ${type.name};`);

  const filename = `${fc(type.name)}.ts`;
  const fullPath = path.join(modelDir, filename);
  generateFile({ fullPath, lines });
}

/**
 * @param {Type[]} types
 */
async function generateTypeFiles(types, modelDir, fromCase, filenameCase) {
  const fc = recase(fromCase, filenameCase);

  R.forEach(t => generateTypeFile(t, modelDir, fc), types);
}

async function generateSchemaFiles({
  db,
  schema,
  tablesToSkip,
  modelDir,
  fromCase,
  filenameCase,
}) {
  const { tables, types } = await extractSchema(schema, tablesToSkip, db);

  await generateTypeFiles(types, modelDir, fromCase, filenameCase);

  await generateModelFiles(
    tables,
    R.pluck('name', types),
    modelDir,
    fromCase,
    filenameCase
  );
}

async function generateModels({
  connection,
  sourceCasing,
  filenameCasing,
  schemas,
}) {
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

  const fromCase = sourceCasing;
  const filenameCase = filenameCasing;

  for (const schema of schemas) {
    console.log(` - Clearing old files in ${schema.modelFolder}`);
    await rmfr(schema.modelFolder, { glob: true });
    fs.mkdirSync(schema.modelFolder);

    await generateSchemaFiles({
      db,
      schema: schema.name,
      tablesToSkip: schema.tablesToIgnore,
      modelDir: schema.modelFolder,
      fromCase,
      filenameCase,
    });
  }
}

module.exports = {
  generateFile,
  generateModels,
};
