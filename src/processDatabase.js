import chalk from 'chalk';
import knex from 'knex';
import rmfr from 'rmfr';
import fs from 'fs';
import { extractSchema } from 'extract-pg-schema';
import defaultTypeMap from './defaultTypeMap';
import { logger } from './logger';
import processSchema from './processSchema';

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
  schemas,
}) => {
  const typeMap = { ...defaultTypeMap, ...customTypeMap };
  const casings = { sourceCasing, typeCasing, propertyCasing, filenameCasing };

  logger.log(
    `Connecting to ${chalk.greenBright(connection.database)} on ${
      connection.host
    }`
  );
  const knexConfig = {
    client: 'pg',
    connection,
  };

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

    await processSchema(schemaConfig, schema, typeMap, casings);
  }
};

export default processDatabase;
