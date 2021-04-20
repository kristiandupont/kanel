import { forEach, map, filter, reject, uniq, pipe } from 'ramda';
import generateInterface from './generateInterface';
import ImportGenerator from './importGenerator';
import path from 'path';

/**
 * @typedef { import('extract-pg-schema').TableOrView } TableOrView
 * @typedef { import('extract-pg-schema').Type } Type
 * @typedef { TableOrView & { isView: boolean } } Model
 * @typedef { import('./Config').Nominators } Nominators
 * @typedef {import('./Config').TypeMap} TypeMap
 */

/**
 * @param {Model} model
 * @param {{ typeMap: TypeMap, userTypes: (string | any)[], schemaName: string, nominators: Nominators, externalTypesFolder?: string, schemaFolderMap: {[schemaName: string]: string}, makeIdType: (innerType: string, modelName: string) => string }} p1
 * @returns {string[]}
 */
const generateModelFile = (
  model,
  {
    typeMap,
    userTypes,
    schemaName,
    nominators,
    externalTypesFolder,
    schemaFolderMap,
    makeIdType,
  }
) => {
  const fileNominator = nominators.fileNominator;
  const makeIdName = (name) =>
    nominators.idNominator(nominators.modelNominator(name), name);

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
  referencedIdTypes.forEach((i) => {
    const givenName = nominators.modelNominator(i.table);
    importGenerator.addImport(
      makeIdName(i.table),
      false,
      path.join(schemaFolderMap[i.schema], fileNominator(givenName, i.table))
    );
  });
  const appliedUserTypes = uniq(
    map(
      (p) => p.type,
      filter((p) => userTypes.indexOf(p.type) !== -1, model.columns)
    )
  );
  appliedUserTypes.forEach((t) => {
    const givenName = nominators.typeNominator(t);
    importGenerator.addImport(
      givenName,
      true,
      path.join(schemaFolderMap[schemaName], fileNominator(givenName, t))
    );
  });

  const overriddenTypes = map(
    (p) => p.tags.type,
    filter((p) => !!p.tags.type, model.columns)
  );
  forEach((importedType) => {
    const givenName = importedType; // We expect people to have used proper casing in their comments
    importGenerator.addImport(
      givenName,
      true,
      path.join(externalTypesFolder, fileNominator(givenName, importedType))
    );
  }, overriddenTypes);

  const importLines = importGenerator.generateLines();
  lines.push(...importLines);

  if (importLines.length) {
    lines.push('');
  }

  const primaryColumns = filter((c) => c.isPrimary, model.columns);

  // If there's one and only one primary key, that's the identifier.
  const hasIdentifier = primaryColumns.length === 1;

  if (hasIdentifier) {
    const [{ type, tags }] = primaryColumns;

    /** @type {string} */
    // @ts-ignore
    const innerType =
      tags.type || typeMap[type] || nominators.typeNominator(type);

    lines.push(
      `export type ${makeIdName(model.name)} = ${makeIdType(
        innerType,
        model.name
      )}`
    );
    lines.push('');
  }

  const properties = model.columns.map((c) => {
    const isIdentifier = hasIdentifier && c.isPrimary;
    const idType = isIdentifier && makeIdName(model.name);
    const referenceType = c.reference && makeIdName(c.reference.table);
    /** @type {string} */
    // @ts-ignore
    let rawType = c.tags.type || idType || referenceType || typeMap[c.type];
    if (!rawType) {
      console.warn(`Unrecognized type: '${c.type}'`);
      rawType = nominators.typeNominator(c.type);
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
      name: nominators.propertyNominator(c.name, model),
      optional: false,
      typeName,
      modelAttributes,
      initializerAttributes,
    };
  });

  const givenName = nominators.modelNominator(model.name);

  const interfaceLines = generateInterface({
    name: givenName,
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
      name: nominators.initializerNominator(givenName, model.name),
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
