import chalk from 'chalk';
import knex from 'knex';
import rmfr from 'rmfr';
import path from 'path';
import fs from 'fs';
import { identity, indexBy, isEmpty, map } from 'ramda';
import { extractSchema } from 'extract-pg-schema';
import defaultTypeMap from './defaultTypeMap';
import { logger } from './logger';
import processSchema from './processSchema';
import { nameIdentity } from './Config';

const labelAsGenerated = (lines) => [
  "// Automatically generated. Don't change this file manually.",
  '',
  ...lines,
];

const addEmptyLineAtEnd = (lines) => [...lines, ''];

const defaultHooks = [labelAsGenerated, addEmptyLineAtEnd];

/**
 * @param {import('./Config').default} config
 */
const processDatabase = async ({
  connection,
  preDeleteModelFolder = false,
  customTypeMap = {},

  modelHooks = [],
  modelNominator = nameIdentity,
  propertyNominator = (propertyName) =>
    propertyName.indexOf(' ') !== -1 ? `'${propertyName}'` : propertyName,
  initializerNominator = (modelName) => `${modelName}Initializer`,
  idNominator = (modelName) => `${modelName}Id`,

  typeHooks = [],
  typeNominator = nameIdentity,

  fileNominator = identity,

  schemas,

  ...unknownProps
}) => {
  if (!isEmpty(unknownProps)) {
    console.warn(
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

  logger.log(
    `Connecting to ${chalk.greenBright(connection.database)} on ${
      connection.host
    }`
  );
  const knexConfig = {
    client: 'pg',
    connection,
  };

  const schemaFolderMap = map(
    (s) => path.resolve(s.modelFolder),
    indexBy((s) => s.name, schemas)
  );

  for (const schemaConfig of schemas) {
    if (preDeleteModelFolder) {
      logger.log(` - Clearing old files in ${schemaConfig.modelFolder}`);
      await rmfr(schemaConfig.modelFolder, { glob: true });
    }
    if (!fs.existsSync(schemaConfig.modelFolder)) {
      fs.mkdirSync(schemaConfig.modelFolder);
    }

    const db = knex(knexConfig);
    const schema = await extractSchema(schemaConfig.name, db);

    await processSchema(
      schemaConfig,
      schema,
      typeMap,
      nominators,
      modelProcessChain,
      typeProcessChain,
      schemaFolderMap
    );
  }
};

export default processDatabase;
