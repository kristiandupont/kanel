import { forEach, map, filter, reject, propEq, uniq, pipe } from 'ramda';
import { recase } from '@kristiandupont/recase';
import generateInterface from './generateInterface';
import ImportGenerator from './importGenerator';
import path from 'path';

/**
 * @typedef { import('extract-pg-schema').TableOrView } TableOrView
 * @typedef { import('extract-pg-schema').Type } Type
 * @typedef { TableOrView & { isView: boolean } } Model
 * @typedef {import('./Config').TypeMap} TypeMap
 * @typedef {import('./Casing').Casings} Casings
 */

/**
 * @param {Model} model
 * @param {{ typeMap: TypeMap, userTypes: (string | any)[], casings: Casings, schemaName: string, schemaFolderMap: {[schemaName: string]: string} }} p1
 * @returns {string[]}
 */
const generateModelFile = (
  model,
  { typeMap, userTypes, casings, schemaName, schemaFolderMap }
) => {
  const tc = recase(casings.sourceCasing, casings.typeCasing);
  const fc = recase(casings.sourceCasing, casings.filenameCasing);
  const pc = recase(casings.sourceCasing, casings.propertyCasing);

  const lines = [];
  const { comment, tags } = model;

  const importGenerator = new ImportGenerator(schemaFolderMap[schemaName]);
  const referencedIdTypes = pipe(
    // @ts-ignore
    filter((p) => Boolean(p.reference)),
    map((p) => p.reference),
    reject((p) => p.schema === schemaName && p.table === model.name),
    // @ts-ignore
    uniq
    // @ts-ignore
  )(model.columns);
  referencedIdTypes.forEach((i) =>
    importGenerator.addImport(
      `${tc(i.table)}Id`,
      false,
      path.join(schemaFolderMap[i.schema], fc(i.table))
    )
  );
  const appliedUserTypes = uniq(
    map(
      (p) => p.type,
      filter((p) => userTypes.indexOf(p.type) !== -1, model.columns)
    )
  );
  appliedUserTypes.forEach((t) =>
    importGenerator.addImport(
      tc(t),
      true,
      // TODO: this should be a configured usertype folder if requested.
      path.join(schemaFolderMap[schemaName], fc(t))
    )
  );
  const importLines = importGenerator.generateLines();
  lines.push(...importLines);

  if (importLines.length) {
    lines.push('');
  }
  const overriddenTypes = map(
    (p) => p.tags.type,
    filter((p) => !!p.tags.type, model.columns)
  );
  forEach((importedType) => {
    lines.push(`import ${tc(importedType)} from '../${fc(importedType)}';`);
  }, overriddenTypes);
  if (overriddenTypes.length) {
    lines.push('');
  }

  const primaryColumns = filter((c) => c.isPrimary, model.columns);

  // If there's one and only one primary key, that's the identifier.
  const hasIdentifier = primaryColumns.length === 1;

  if (hasIdentifier) {
    const [{ type, tags }] = primaryColumns;
    const innerType = tags.type || typeMap[type] || tc(type);
    lines.push(
      `export type ${tc(model.name)}Id = ${innerType} & { __flavor?: '${
        model.name
      }' };`
    );
    lines.push('');
  }

  const properties = model.columns.map((c) => {
    const wrappedName = c.name.indexOf(' ') !== -1 ? `'${c.name}'` : c.name;
    const isIdentifier = hasIdentifier && c.isPrimary;
    const idType = isIdentifier && `${tc(model.name)}Id`;
    const referenceType = c.reference && `${tc(c.reference.table)}Id`;
    /** @type {string} */
    // @ts-ignore
    let rawType = c.tags.type || idType || referenceType || typeMap[c.type];
    if (!rawType) {
      console.warn(`Unrecognized type: '${c.type}'`);
      rawType = tc(c.type);
    }
    const typeName = c.nullable ? `${rawType} | null` : rawType;
    const modelAttributes = {
      commentLines: c.comment ? [c.comment] : [],
      optional: false,
    };
    const initializerAttributes = {
      omit: c.generated === 'ALWAYS',
      commentLines: c.comment ? [c.comment] : [],
      optional: c.defaultValue || c.nullable,
    };

    if (c.defaultValue) {
      initializerAttributes.commentLines.push(
        `Default value: ${c.defaultValue}`
      );
    }

    c.indices.forEach((index) => {
      const commentLine = index.isPrimary
        ? `Primary key. Index: ${index.name}`
        : `Index: ${index.name}`;
      modelAttributes.commentLines.push(commentLine);
      initializerAttributes.commentLines.push(commentLine);
    });

    return {
      name: pc(wrappedName),
      optional: false,
      typeName,
      modelAttributes,
      initializerAttributes,
    };
  });

  const interfaceLines = generateInterface({
    name: tc(model.name),
    properties: properties.map(({ modelAttributes, ...props }) => ({
      ...props,
      ...modelAttributes,
    })),
    comment,
    exportAsDefault: true,
  });
  lines.push(...interfaceLines);

  const generateInitializer = !tags['fixed'] && !model.isView;
  if (generateInitializer) {
    lines.push('');
    const initializerInterfaceLines = generateInterface({
      name: `${tc(model.name)}Initializer`,
      properties: properties
        .filter((p) => !p.initializerAttributes.omit)
        .map(({ initializerAttributes, ...props }) => ({
          ...props,
          ...initializerAttributes,
        })),
      comment,
      exportAsDefault: false,
    });
    lines.push(...initializerInterfaceLines);
  }
  return lines;
};

export default generateModelFile;
