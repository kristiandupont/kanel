import path from 'path';
import { map, filter, reject } from 'ramda';
import generateFile from './generateFile';

/**
 * @param {Table[]} tables
 */
function generateIndexFile(tables, userTypes, modelDir, pc, cc, fc) {
  const isFixed = (m) => m.isView || m.tags['fixed'];

  const hasIdentifier = (m) =>
    filter((c) => c.isPrimary, m.columns).length === 1;
  const creatableModels = reject(isFixed, tables);
  const modelsWithIdColumn = filter(hasIdentifier, tables);
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
    ...map(importLine, tables),
    ...map(t => `import ${pc(t)} from './${fc(t)}';`, userTypes),
    '',
    'type Model =',
    ...map((model) => `  | ${pc(model.name)}`, tables),
    '',
    'interface ModelTypeMap {',
    ...map((model) => `  '${cc(model.name)}': ${pc(model.name)};`, tables),
    '}',
    '',
    'type ModelId =',
    ...map((model) => `  | ${pc(model.name)}Id`, modelsWithIdColumn),
    '',
    'interface ModelIdTypeMap {',
    ...map(
      (model) => `  '${cc(model.name)}': ${pc(model.name)}Id;`,
      modelsWithIdColumn
    ),
    '}',
    '',
    'type Initializer =',
    ...map((model) => `  | ${pc(model.name)}Initializer`, creatableModels),
    '',
    'interface InitializerTypeMap {',
    ...map(
      (model) => `  '${cc(model.name)}': ${pc(model.name)}Initializer;`,
      creatableModels
    ),
    '}',
    '',
    'export {',
    ...map(exportLine, tables),
    ...map(t => `  ${pc(t)},`, userTypes),
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

export default generateIndexFile;
