import { Column, Reference } from 'extract-pg-schema';
import path from 'path';
import { filter, forEach, map, pipe, reject, uniq } from 'ramda';

import { Nominators, TypeMap } from './Config';
import generateInterface from './generateInterface';
import ImportGenerator from './importGenerator';
import { logger } from './logger';
import { TableModel, ViewModel } from './Model';

const generateModelFile = (
  model: TableModel | ViewModel,
  {
    typeMap,
    userTypes,
    schemaName,
    nominators,
    externalTypesFolder,
    schemaFolderMap,
    makeIdType,
  }: {
    typeMap: TypeMap;
    userTypes: (string | any)[];
    schemaName: string;
    nominators: Nominators;
    externalTypesFolder?: string;
    schemaFolderMap: { [schemaName: string]: string };
    makeIdType: (innerType: string, modelName: string) => string;
  }
): string[] => {
  const fileNominator = nominators.fileNominator;
  const makeIdName = (name) =>
    nominators.idNominator(nominators.modelNominator(name), name);

  const lines = [];
  const { comment, tags } = model;

  const importGenerator = new ImportGenerator(schemaFolderMap[schemaName]);
  const referencedIdTypes = pipe(
    filter((p: Column) => Boolean(p.reference)),
    map((p) => p.reference),
    reject((p: Reference) => p.schema === schemaName && p.table === model.name),
    uniq
  )(model.columns);
  referencedIdTypes.forEach((i) => {
    const givenName = nominators.modelNominator(i.table);
    importGenerator.addImport(
      makeIdName(i.table),
      false,
      path.join(schemaFolderMap[i.schema], fileNominator(givenName, i.table)),
      false
    );
  });
  const cols = map(
    ({ isArray, type, subType, ...rest }) => ({
      type: isArray ? subType : type,
      ...rest,
    }),
    model.columns
  );
  const appliedUserTypes = uniq(
    map(
      (p: Column | { type: string }) => p.type,
      filter((p) => userTypes.indexOf(p.type) !== -1, cols)
    )
  );
  appliedUserTypes.forEach((t) => {
    const givenName = nominators.typeNominator(t);
    importGenerator.addImport(
      givenName,
      true,
      path.join(schemaFolderMap[schemaName], fileNominator(givenName, t)),
      false
    );
  });

  const overriddenTypes = map(
    (p: Column) => p.tags.type as string,
    filter((p) => Boolean(p.tags.type), model.columns)
  );
  forEach((importedType) => {
    const givenName = importedType; // We expect people to have used proper casing in their comments
    importGenerator.addImport(
      givenName,
      true,
      path.join(externalTypesFolder, fileNominator(givenName, importedType)),
      false
    );
  }, overriddenTypes);

  const primaryColumns = filter((c) => c.isPrimary, model.columns);

  // If there's one and only one primary key, that's the identifier.
  const hasIdentifier = primaryColumns.length === 1;

  const properties = model.columns.map((c) => {
    const isIdentifier = hasIdentifier && c.isPrimary;
    const idType = isIdentifier && makeIdName(model.name);
    const referenceType = c.reference && makeIdName(c.reference.table);
    let rawType = c.tags.type || idType || referenceType || typeMap[c.type];
    if (typeof rawType === 'boolean') {
      throw new Error('@type tag must include the actual type: "@type:string"');
    }
    if (typeof rawType === 'object') {
      importGenerator.addImport(
        rawType.name,
        rawType.defaultImport,
        rawType.absoluteImport
          ? rawType.module
          : path.join(
              externalTypesFolder || schemaFolderMap[schemaName],
              rawType.module
            ),
        rawType.absoluteImport
      );
      rawType = rawType.name;
    }
    if (!rawType) {
      logger.warn(`Unrecognized type for ${model.name}.${c.name}: '${c.type}'`);
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

  const importLines = importGenerator.generateLines();
  lines.push(...importLines);

  if (importLines.length) {
    lines.push('');
  }

  if (hasIdentifier) {
    const [{ type, tags }] = primaryColumns;

    const innerType = (tags.type ||
      typeMap[type] ||
      nominators.typeNominator(type)) as string;

    lines.push(
      `export type ${makeIdName(model.name)} = ${makeIdType(
        innerType,
        model.name
      )}`
    );
    lines.push('');
  }

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

  const generateInitializer = !tags['fixed'] && model.type === 'table';
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
