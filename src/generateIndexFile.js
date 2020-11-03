import { map, filter, reject } from 'ramda';
import { recase } from '@kristiandupont/recase';

/**
 * @param {import('extract-pg-schema').TableOrView[]} models
 * @param {string[]} userTypes
 * @param {import('./Casing').Casings} casings
 * @returns {string[]}
 */
function generateIndexFile(models, userTypes, casings) {
  const tc = recase(casings.sourceCasing, casings.typeCasing);
  const pc = recase(casings.sourceCasing, casings.propertyCasing);
  const fc = recase(casings.sourceCasing, casings.filenameCasing);

  const isFixed = (m) => m.isView || m.tags['fixed'];

  const hasIdentifier = (m) =>
    filter((c) => c.isPrimary, m.columns).length === 1;
  const creatableModels = reject(isFixed, models);
  const modelsWithIdColumn = filter(hasIdentifier, models);
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
    ...map(importLine, models),
    ...map((t) => `import ${tc(t)} from './${fc(t)}';`, userTypes),
    '',
    'type Model =',
    ...map((model) => `  | ${tc(model.name)}`, models),
    '',
    'interface ModelTypeMap {',
    ...map((model) => `  '${pc(model.name)}': ${tc(model.name)};`, models),
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
    ...map(exportLine, models),
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
  return lines;
}

export default generateIndexFile;
