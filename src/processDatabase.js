import chalk from 'chalk';
import knex from 'knex';
import rmfr from 'rmfr';
import path from 'path';
import fs from 'fs';
import { indexBy, map } from 'ramda';
import { extractSchema } from 'extract-pg-schema';
import defaultTypeMap from './defaultTypeMap';
import { logger } from './logger';
import processSchema from './processSchema';

const labelAsGenerated = (lines, { name }) => [
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
  sourceCasing = null,
  typeCasing = null,
  propertyCasing = null,
  filenameCasing = null,
  preDeleteModelFolder = false,
  customTypeMap = {},
  modelHooks = [],
  typeHooks = [],
  schemas,
}) => {
  const typeMap = { ...defaultTypeMap, ...customTypeMap };
  const casings = { sourceCasing, typeCasing, propertyCasing, filenameCasing };
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

  console.log({ schemaFolderMap });

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
      casings,
      modelProcessChain,
      typeProcessChain,
      schemaFolderMap
    );
  }
};

export default processDatabase;
