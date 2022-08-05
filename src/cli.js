import chalk from 'chalk';
import optionator from 'optionator';
import path from 'path';

import { logger } from './logger';
import processDatabase from './processDatabase';
// @ts-ignore
const { version } = require('../package.json');

async function main() {
  const o = optionator({
    prepend: 'Usage: kanel [options]',
    append: `Version ${version}`,
    options: [
      {
        option: 'help',
        alias: 'h',
        type: 'Boolean',
        description: 'displays help',
      },
      {
        option: 'version',
        alias: 'v',
        type: 'Boolean',
        description: 'displays version',
      },
      {
        option: 'config',
        alias: 'c',
        type: 'path::String',
        description:
          'Use this configuration, overriding .kanelrc.js config options if present',
      },
      {
        option: 'database',
        alias: 'd',
        type: 'string',
        description:
          'Database connection string. Will override the connection field in the config file if present',
      },
      {
        option: 'output',
        alias: 'o',
        type: 'path::String',
        description:
          'Output directory. Will override the output field in the config file if present',
      },
    ],
  });

  let options;

  try {
    options = o.parseArgv(process.argv);
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }

  if (options.help) {
    console.info(o.generateHelp());
    process.exit(0);
  }

  if (options.version) {
    console.info(version);
    process.exit(0);
  }

  const configFile = path.join(process.cwd(), options.config || '.kanelrc.js');
  const config = require(configFile);

  if (config.logLevel !== undefined) {
    logger({ level: config.logLevel });
  }

  logger.log(chalk.greenBright('Kanel'));

  try {
    await processDatabase(config);
    process.exit(0);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}

main();
