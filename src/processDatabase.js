import chalk from 'chalk';
import knex from 'knex';
import rmfr from 'rmfr';
import fs from 'fs';
import { pluck, reject } from 'ramda';
import { extractSchema } from 'extract-pg-schema';
import { recase } from '@kristiandupont/recase';
import generateModelFile from './generateModelFile';
import generateTypeFile from './generateTypeFile';
import generateIndexFile from './generateIndexFile';
import { logger } from './logger';

const defaultTypeMap = {
  int2: 'number',
  int4: 'number',
  float4: 'number',
  numeric: 'number',
  bool: 'boolean',
  json: 'unknown',
  jsonb: 'unknown',
  char: 'string',
  varchar: 'string',
  text: 'string',
  date: 'Date',
  time: 'Date',
  timetz: 'Date',
  timestamp: 'Date',
  timestamptz: 'Date',
};

const processDatabase = async ({
  connection,
  sourceCasing = 'snake',
  filenameCasing = 'pascal',
  preDeleteModelFolder = false,
  customTypeMap = {},
  schemas,
}) => {
  const typeMap = { ...defaultTypeMap, ...customTypeMap };

  logger.log(
    `Connecting to ${chalk.greenBright(connection.database)} on ${
      connection.host
    }`
  );
  const knexConfig = {
    client: 'pg',
    connection,
  };
  const db = knex(knexConfig);

  for (const schema of schemas) {
    if (preDeleteModelFolder) {
      logger.log(` - Clearing old files in ${schema.modelFolder}`);
      await rmfr(schema.modelFolder, { glob: true });
    }
    if (!fs.existsSync(schema.modelFolder)) {
      fs.mkdirSync(schema.modelFolder);
    }

    const pc = recase(sourceCasing, 'pascal');
    const cc = recase(sourceCasing, 'camel');
    const fc = recase(sourceCasing, filenameCasing);

    const { tables, views, types } = await extractSchema(schema.name, db);
    const rejectIgnored = reject((m) => (schema.ignore || []).includes(m.name));
    const includedTables = rejectIgnored(tables);
    const includedViews = rejectIgnored(views).map((v) => ({
      ...v,
      isView: true,
    }));

    types.forEach((t) => generateTypeFile(t, schema.modelFolder, fc, pc));

    const userTypes = pluck('name', types);
    includedTables.forEach((t) =>
      generateModelFile(t, typeMap, userTypes, schema.modelFolder, pc, fc)
    );
    includedViews.forEach((v) =>
      generateModelFile(v, typeMap, userTypes, schema.modelFolder, pc, fc)
    );

    generateIndexFile(
      [...includedTables, ...includedViews],
      userTypes,
      schema.modelFolder,
      pc,
      cc,
      fc
    );
  }
};

export default processDatabase;
