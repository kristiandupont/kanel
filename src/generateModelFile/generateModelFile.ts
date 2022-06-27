import { Column } from 'extract-pg-schema';
import path from 'path';
import { filter } from 'ramda';

import { ModelAgentNoun, Nominators, TypeMap } from '../Config';
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
    generateZodSchemas,
  }: {
    modelCommentGenerator: (model: TableModel | ViewModel) => string[];
    propertyCommentGenerator: (
      column: Column,
      model: TableModel | ViewModel,
      modelAgentNoun: ModelAgentNoun
    ) => string[];
    typeMap: TypeMap;
    userTypes: (string | any)[];
    schemaName: string;
    nominators: Nominators;
    externalTypesFolder?: string;
    schemaFolderMap: { [schemaName: string]: string };
    makeIdType: (innerType: string, modelName: string) => string;
    generateZodSchemas: boolean;
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
    } else if (c.tags.type) {
      typeImport = {
        name: rawType,
        isDefault: true,
        absolutePath: path.join(
          externalTypesFolder,
          nominators.fileNominator(rawType, rawType)
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
      rawType = nominators.typeDefinitionNominator(c.type);
    }

    const typeName = c.nullable ? `${rawType} | null` : rawType;

    return {
      c,
      name: nominators.propertyNominator(c.name, c, model),
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
      comments: propertyCommentGenerator(p.c, model, 'definition'),
      typeImport: p.typeImport,
      typeName: p.typeName,
      isArray: p.isArray,
      isNullable: p.c.nullable,
      isOptional: false,
    })),
  });

  if (generateZodSchemas) {
    setup.declarations.push({
      declarationType: 'zodSchema',
      name: zodSchemaNominator(p.c, model, 'definition'),
      properties: props.map((p) => ({
        name: p.name,
        typeImport: p.typeImport,
        typeName: p.typeName,
        isArray: p.isArray,
        isNullable: p.c.nullable,
        isOptional: false,
        isBuiltin: true,
      })),
    });
  }

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

export default generateModelFile;
