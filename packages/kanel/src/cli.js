import chalk from 'chalk';
import cliProgress from 'cli-progress';
import optionator from 'optionator';
import path from 'path';
import fs from 'fs';

import processDatabase from './processDatabase';
// @ts-ignore
const { version } = require('../package.json');

async function main() {
  console.info(chalk.greenBright('Kanel'));

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
    console.error(error.message);
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

  /** @type {import('./config-types').Config} */
  let config;
  const configFile = path.join(process.cwd(), options.config || '.kanelrc.js');
  if (fs.existsSync(configFile)) {
    try {
      config = require(configFile);
    } catch (error) {
      console.error('Could not open ' + options.config, ': ', error);
      process.exit(1);
    }
  } else {
    config = { connection: 'Missing connection string' };
  }

  if (options.database) {
    config.connection = options.database;
  }
  if (!config.connection) {
    console.error('No database specified, in config file or command line');
    process.exit(1);
  }

  if (options.output) {
    config.outputPath = options.output;
  }
  if (!config.outputPath) {
    console.error('No output path specified, in config file or command line');
    process.exit(1);
  }

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  const progress = {
    onProgressStart: (total) => bar.start(total, 0),
    onProgress: () => bar.increment(),
    onProgressEnd: () => bar.stop(),
  };

  try {
    await processDatabase(config, progress);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
