import path from 'path';
import { map, filter, reject } from 'ramda';
import { recase } from '@kristiandupont/recase';
import generateFile from './generateFile';

/**
 * @param {import('extract-pg-schema').Table[]} tables
 */
function generateIndexFile(
  tables,
  userTypes,
  modelDir,
  sourceCasing,
  typeCasing,
  propertyCasing,
  filenameCasing
) {
  const tc = recase(sourceCasing, typeCasing);
  const pc = recase(sourceCasing, propertyCasing);
  const fc = recase(sourceCasing, filenameCasing);

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
      return `import ${tc(m.name)} from './${fc(m.name)}';`;
    } else {
      const imports = [
        ...(importInitializer ? [`${tc(m.name)}Initializer`] : []),
        ...(importId ? [`${tc(m.name)}Id`] : []),
      ];
      return `import ${tc(m.name)}, { ${imports.join(', ')} } from './${fc(
        m.name
      )}';`;
    }
  };
  const exportLine = (m) => {
    const exportInitializer = !isFixed(m);
    const exportId = hasIdentifier(m);
    const exports = [
      tc(m.name),
      ...(exportInitializer ? [`${tc(m.name)}Initializer`] : []),
      ...(exportId ? [`${tc(m.name)}Id`] : []),
    ];
    return `  ${exports.join(', ')},`;
  };
  const lines = [
    ...map(importLine, tables),
    ...map((t) => `import ${tc(t)} from './${fc(t)}';`, userTypes),
    '',
    'type Model =',
    ...map((model) => `  | ${tc(model.name)}`, tables),
    '',
    'interface ModelTypeMap {',
    ...map((model) => `  '${pc(model.name)}': ${tc(model.name)};`, tables),
    '}',
    '',
    'type ModelId =',
    ...map((model) => `  | ${tc(model.name)}Id`, modelsWithIdColumn),
    '',
    'interface ModelIdTypeMap {',
    ...map(
      (model) => `  '${pc(model.name)}': ${tc(model.name)}Id;`,
      modelsWithIdColumn
    ),
    '}',
    '',
    'type Initializer =',
    ...map((model) => `  | ${tc(model.name)}Initializer`, creatableModels),
    '',
    'interface InitializerTypeMap {',
    ...map(
      (model) => `  '${pc(model.name)}': ${tc(model.name)}Initializer;`,
      creatableModels
    ),
    '}',
    '',
    'export {',
    ...map(exportLine, tables),
    ...map((t) => `  ${tc(t)},`, userTypes),
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
