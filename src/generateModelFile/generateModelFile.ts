import { Column, Reference } from 'extract-pg-schema';
import path from 'path';
import { filter, forEach, map, pipe, reject, uniq } from 'ramda';

import { ModelAdjective, Nominators, TypeMap } from '../Config';
import generateInterface from '../generateInterface';
import ImportGenerator from '../importGenerator';
import { logger } from '../logger';
import { TableModel, ViewModel } from '../Model';
import ModelFileGenerationSetup, {
  TypeImport,
} from './ModelFileGenerationSetup';
import processGenerationSetup from './processGenerationSetup';

const generateModelFile = (
  model: TableModel | ViewModel,
  {
    modelCommentGenerator,
    propertyCommentGenerator,
    typeMap,
    userTypes,
    schemaName,
    nominators,
    externalTypesFolder,
    schemaFolderMap,
    makeIdType,
  }: {
    modelCommentGenerator: (model: TableModel | ViewModel) => string[];
    propertyCommentGenerator: (
      column: Column,
      model: TableModel | ViewModel,
      modelAdjective: ModelAdjective
    ) => string[];
    typeMap: TypeMap;
    userTypes: (string | any)[];
    schemaName: string;
    nominators: Nominators;
    externalTypesFolder?: string;
    schemaFolderMap: { [schemaName: string]: string };
    makeIdType: (innerType: string, modelName: string) => string;
  }
): string[] => {
  const setup: ModelFileGenerationSetup = {
    declarations: [],
  };

  const primaryColumns = filter((c) => c.isPrimary, model.columns);

  // If there's one and only one primary key, that's the identifier.
  const hasIdentifier = primaryColumns.length === 1;

  const makeIdName = (name) =>
    nominators.idNominator(nominators.modelNominator(name), name);

  if (hasIdentifier) {
    const [{ type, tags }] = primaryColumns;

    const innerType = (tags.type ||
      typeMap[type] ||
      nominators.typeNominator(type)) as string;

    setup.declarations.push({
      declarationType: 'typeDeclaration',
      name: makeIdName(model.name),
      typeDefinition: makeIdType(innerType, model.name),
    });
  }

  const props = model.columns.map((c) => {
    const isIdentifier = hasIdentifier && c.isPrimary;
    const idType = isIdentifier && makeIdName(model.name);
    const referenceType = c.reference && makeIdName(c.reference.table);
    let rawType = c.tags.type || idType || referenceType || typeMap[c.type];
    if (typeof rawType === 'boolean') {
      throw new Error('@type tag must include the actual type: "@type:string"');
    }
    let typeImport: TypeImport | null = null;
    if (typeof rawType === 'object') {
      typeImport = {
        name: rawType.name,
        isDefault: rawType.defaultImport,
        absolutePath: rawType.absoluteImport
          ? rawType.module
          : path.join(
              externalTypesFolder || schemaFolderMap[schemaName],
              rawType.module
            ),
        isAbsolute: rawType.absoluteImport,
      };
      rawType = rawType.name;
    } else if (userTypes.indexOf(c.isArray ? c.subType : c.type) !== -1) {
      typeImport = {
        name: c.type,
        isDefault: true,
        absolutePath: path.join(
          schemaFolderMap[schemaName],
          nominators.fileNominator(
            nominators.typeNominator(c.isArray ? c.subType : c.type),
            c.isArray ? c.subType : c.type
          )
        ),
        isAbsolute: false,
      };
    } else if (
      c.reference &&
      (c.reference.schema !== schemaName || c.reference.table !== model.name)
    ) {
      typeImport = {
        name: rawType,
        isDefault: false,
        absolutePath: path.join(
          schemaFolderMap[c.reference.schema],
          nominators.fileNominator(
            nominators.modelNominator(c.reference.table),
            c.reference.table
          )
        ),
        isAbsolute: false,
      };
    }
    if (!rawType) {
      logger.warn(`Unrecognized type for ${model.name}.${c.name}: '${c.type}'`);
      rawType = nominators.typeNominator(c.type);
    }

    const typeName = c.nullable ? `${rawType} | null` : rawType;

    return {
      c,
      name: nominators.propertyNominator(c.name, model),
      typeImport,
      typeName: typeName,
      isArray: false,
    };
  });

  const givenName = nominators.modelNominator(model.name);

  setup.declarations.push({
    declarationType: 'interface',
    isDefaultExport: true,
    name: givenName,
    comments: modelCommentGenerator(model),
    properties: props.map((p) => ({
      name: p.name,
      comments: propertyCommentGenerator(p.c, model, 'interface'),
      typeImport: p.typeImport,
      typeName: p.typeName,
      isArray: p.isArray,
      isNullable: p.c.nullable,
      isOptional: false,
    })),
  });

  const generateInitializer = !model.tags['fixed'] && model.type === 'table';
  if (generateInitializer) {
    setup.declarations.push({
      declarationType: 'interface',
      isDefaultExport: false,
      name: nominators.initializerNominator(givenName, model.name),
      comments: modelCommentGenerator(model),
      properties: props.map((p) => ({
        name: p.name,
        comments: propertyCommentGenerator(p.c, model, 'initializer'),
        typeImport: p.typeImport,
        typeName: p.typeName,
        isArray: p.isArray,
        isNullable: p.c.nullable,
        isOptional: p.c.defaultValue || p.c.nullable,
      })),
    });
  }

  const lines = processGenerationSetup(setup, schemaFolderMap[schemaName]);
  return lines;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const generateModelFile_ = (
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

  const properties = model.columns.map((c: Column) => {
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
