import { filter, map, reject } from 'ramda';

/**
 * @param {import('extract-pg-schema').TableOrView[]} models
 * @param {string[]} userTypes
 * @param {import('./generateModelFile').Nominators} nominators
 * @returns {string[]}
 */
function generateIndexFile(models, userTypes, nominators) {
  // const tc = recase(casings.sourceCasing, casings.typeCasing);
  // const pc = recase(casings.sourceCasing, casings.propertyCasing);
  // const fc = recase(casings.sourceCasing, casings.filenameCasing);

  const isFixed = (m) => m.type !== 'table' || m.tags['fixed'];

  const hasIdentifier = (m) =>
    filter((c) => c.isPrimary, m.columns).length === 1;
  const creatableModels = reject(isFixed, models);
  const modelsWithIdColumn = filter(hasIdentifier, models);
  const importLine = (m) => {
    const importInitializer = !isFixed(m);
    const importId = hasIdentifier(m);
    const additionalImports = importInitializer || importId;
    const givenName = nominators.modelNominator(m.name);
    const fileName = nominators.fileNominator(givenName, m.name);
    if (!additionalImports) {
      return `import ${givenName} from './${fileName}';`;
    } else {
      const imports = [
        ...(importInitializer
          ? [nominators.initializerNominator(givenName, m.name)]
          : []),
        ...(importId ? [nominators.idNominator(givenName, m.name)] : []),
      ];
      return `import ${givenName}, { ${imports.join(
        ', '
      )} } from './${fileName}';`;
    }
  };
  const exportLine = (m) => {
    const givenName = nominators.modelNominator(m.name);
    const exportInitializer = !isFixed(m);
    const exportId = hasIdentifier(m);
    const exports = [
      givenName,
      ...(exportInitializer
        ? [nominators.initializerNominator(givenName, m.name)]
        : []),
      ...(exportId ? [nominators.idNominator(givenName, m.name)] : []),
    ];
    return `  ${exports.join(', ')},`;
  };

  const lines = [
    ...map(importLine, models),
    ...map(
      (t) =>
        `import ${nominators.typeNominator(
          t
        )} from './${nominators.fileNominator(
          nominators.typeNominator(t),
          t
        )}';`,
      userTypes
    ),
    '',
    'type Model =',
    ...map((model) => `  | ${nominators.modelNominator(model.name)}`, models),
    '',
    'interface ModelTypeMap {',
    ...map(
      (model) => `  '${model.name}': ${nominators.modelNominator(model.name)};`,
      models
    ),
    '}',
    '',
    'type ModelId =',
    ...map(
      (model) =>
        `  | ${nominators.idNominator(
          nominators.modelNominator(model.name),
          model.name
        )}`,
      modelsWithIdColumn
    ),
    '',
    'interface ModelIdTypeMap {',
    ...map(
      (model) =>
        `  '${model.name}': ${nominators.idNominator(
          nominators.modelNominator(model.name),
          model.name
        )};`,
      modelsWithIdColumn
    ),
    '}',
    '',
    ...(creatableModels.length > 0 ?
      [
        'type Initializer =',
        ...map(
          (model) =>
            `  | ${nominators.initializerNominator(
              nominators.modelNominator(model.name),
              model.name
            )}`,
          creatableModels
        )]
      : ['type Initializer = never']),
    '',
    'interface InitializerTypeMap {',
    ...map(
      (model) =>
        `  '${model.name}': ${nominators.initializerNominator(
          nominators.modelNominator(model.name),
          model.name
        )};`,
      creatableModels
    ),
    '}',
    '',
    'export type {',
    ...map(exportLine, models),
    ...map((t) => `  ${nominators.typeNominator(t)},`, userTypes),
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
