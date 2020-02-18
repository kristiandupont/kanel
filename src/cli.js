import path from 'path';
import chalk from 'chalk';
// @ts-ignore
import optionator from 'optionator';
import { generateModels } from './engine';
// @ts-ignore
// const { version } = require('../package.json');
const version = '0.1.1';

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
        option: 'config',
        alias: 'c',
        type: 'path::String',
        description:
          'Use this configuration, overriding .schemalintrc.* config options if present',
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
    console.log(o.generateHelp());
    process.exit(0);
  }

  console.log(`${chalk.greenBright('Kanel')}`);
  const configFile = path.join(process.cwd(), options.config || '.kanelrc.js');
  const config = require(configFile);

  try {
    const exitCode = await generateModels(config);
    process.exit(exitCode);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
