const path = require('path');
const R = require('ramda');
const generateFile = require('./generateFile');

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

module.exports = generateModelIndexFile;
