import path from 'path';
const { forEach, map, filter, reject, propEq, uniq } = require('ramda');
import generateFile from './generateFile';
import generateInterface from './generateInterface';

/**
 * @typedef { import('extract-pg-schema').Table } Table
 * @typedef { import('extract-pg-schema').Type } Type
 */

/**
 * @param {Table} tableOrView
 */
const generateModelFile = (
  tableOrView,
  isView,
  typeMap,
  userTypes,
  modelDir,
  pc,
  cc,
  fc
) => {
  const lines = [];
  const { comment, tags } = tableOrView;
  const generateInitializer = !tags['fixed'] && !isView;
  const referencedIdTypes = uniq(
    map(
      (p) => p.parent.split('.')[0],
      filter((p) => !!p.parent, tableOrView.columns)
    )
  );
  forEach((referencedIdType) => {
    lines.push(
      `import { ${pc(referencedIdType)}Id } from './${fc(referencedIdType)}';`
    );
  }, referencedIdTypes);
  if (referencedIdTypes.length) {
    lines.push('');
  }
  const appliedUserTypes = map(
    (p) => p.type,
    filter((p) => userTypes.indexOf(p.type) !== -1, tableOrView.columns)
  );
  forEach((importedType) => {
    lines.push(`import ${pc(importedType)} from './${fc(importedType)}';`);
  }, appliedUserTypes);
  if (appliedUserTypes.length) {
    lines.push('');
  }
  const overriddenTypes = map(
    (p) => p.tags.type,
    filter((p) => !!p.tags.type, tableOrView.columns)
  );
  forEach((importedType) => {
    lines.push(`import ${pc(importedType)} from '../${fc(importedType)}';`);
  }, overriddenTypes);
  if (overriddenTypes.length) {
    lines.push('');
  }
  // If there's one and only one primary key, that's the identifier.
  const hasIdentifier =
    filter((c) => c.isPrimary, tableOrView.columns).length === 1;
  const columns = map(
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
        properties: reject(propEq('name', 'createdAt'), columns),
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
};

export default generateModelFile;
