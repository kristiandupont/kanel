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

  for (const schema of schemas) {
    if (preDeleteModelFolder) {
      logger.log(` - Clearing old files in ${schema.modelFolder}`);
      await rmfr(schema.modelFolder, { glob: true });
    }
    if (!fs.existsSync(schema.modelFolder)) {
      fs.mkdirSync(schema.modelFolder);
    }

    const db = knex(knexConfig);
    const extractedSchemaObject = await extractSchema(schema.name, db);

    await processSchema(schema, extractedSchemaObject, typeMap, casings);
  }
};

export default processDatabase;
