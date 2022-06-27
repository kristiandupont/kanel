import chalk from 'chalk';
import { Column, extractSchema } from 'extract-pg-schema';
import fs from 'fs';
import path from 'path';
import { identity, indexBy, isEmpty, map } from 'ramda';
import rmfr from 'rmfr';

import Config, {
  Hook,
  ModelAgentNoun,
  SchemaConfig,
} from './Config';
import defaultTypeMap from './defaultTypeMap';
import { logger } from './logger';
import { TableModel, ViewModel } from './Model';
import processSchema from './processSchema';

const labelAsGenerated: Hook<unknown> = (lines) => [
  '// @generated',
  "// Automatically generated. Don't change this file manually.",
  '',
  ...lines,
];

const addEmptyLineAtEnd: Hook<unknown> = (lines) => [...lines, ''];

const defaultHooks = [labelAsGenerated, addEmptyLineAtEnd];

const defaultPropertyCommentGenerator = (
  column: Column,
  _model: TableModel | ViewModel,
  modelAgentNoun: ModelAgentNoun
) => {
  const commentLines: string[] = column.comment ? [column.comment] : [];

  if (modelAgentNoun === 'initializer') {
    if (column.defaultValue) {
      commentLines.push(`Default value: ${column.defaultValue}`);
    }
  }

  column.indices.forEach((index) => {
    const commentLine = index.isPrimary
      ? `Primary key. Index: ${index.name}`
      : `Index: ${index.name}`;
    commentLines.push(commentLine);
  });
  return commentLines;
};

const processDatabase = async ({
  connection,
  preDeleteModelFolder = false,
  customTypeMap = {},

  modelHooks = [],
  modelNominator = nameIdentity,
  modelCommentGenerator = (model: TableModel | ViewModel) =>
    model.comment ? [model.comment] : [],
  propertyNominator = (propertyName) =>
    propertyName.indexOf(' ') !== -1 ? `'${propertyName}'` : propertyName,
  propertyCommentGenerator = defaultPropertyCommentGenerator,
  initializerNominator = (modelName) => `${modelName}Initializer`,
  idNominator = (modelName) => `${modelName}Id`,

  makeIdType = (innerType, modelName) =>
    `${innerType} & { " __flavor"?: '${modelName}' }`,

  typeHooks = [],
  typeNominator = nameIdentity,

  fileNominator = identity,

  resolveViews = false,

  schemas,

  ...unknownProps
}: Config): Promise<void> => {
  if (!isEmpty(unknownProps)) {
    logger.warn(
      `Unknown configuration properties: ${Object.keys(unknownProps).join(
        ', '
      )}`
    );
  }

  const typeMap = { ...defaultTypeMap, ...customTypeMap };
  /** @type {import('./Config').Nominators} */
  const nominators = {
    modelNominator,
    propertyNominator,
    initializerNominator,
    idNominator,
    typeNominator,
    fileNominator,
  };
  const modelProcessChain = [...defaultHooks, ...modelHooks];
  const typeProcessChain = [...defaultHooks, ...typeHooks];

  if (typeof connection === 'string') {
    logger.log(`Connecting to ${chalk.greenBright(connection)}`);
  } else {
    logger.log(
      `Connecting to ${chalk.greenBright(connection.database)} on ${
        connection.host
      }`
    );
  }

  const schemaFolderMap = map(
    (s: SchemaConfig) => path.resolve(s.modelFolder),
    indexBy((s) => s.name, schemas)
  ) as Record<string, string>;

  for (const schemaConfig of schemas) {
    logger.log('Processing schema: ' + chalk.greenBright(schemaConfig.name));
    const schema = await extractSchema(
      schemaConfig.name,
      connection,
      schemaConfig.resolveViews !== undefined
        ? schemaConfig.resolveViews
        : resolveViews
    );

    if (preDeleteModelFolder) {
      logger.log(` - Clearing old files in ${schemaConfig.modelFolder}`);
      await rmfr(schemaConfig.modelFolder, { glob: true });
    }
    if (!fs.existsSync(schemaConfig.modelFolder)) {
      fs.mkdirSync(schemaConfig.modelFolder, { recursive: true });
    }

    await processSchema(
      schemaConfig,
      schema,
      typeMap,
      modelCommentGenerator,
      propertyCommentGenerator,
      nominators,
      modelProcessChain,
      typeProcessChain,
      schemaFolderMap,
      makeIdType
    );
  }
};

export default processDatabase;
