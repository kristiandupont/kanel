import chalk from "chalk";
import cliProgress from "cli-progress";
import fs from "fs";
import optionator from "optionator";
import path from "path";

import type { Config } from "../config-types";
import processDatabase from "../processDatabase";

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require("../../package.json");

export async function main(): Promise<void> {
  console.info(chalk.greenBright("Kanel"));

  const o = optionator({
    prepend: "Usage: kanel [options]",
    append: `Version ${version}`,
    options: [
      {
        option: "help",
        alias: "h",
        type: "Boolean",
        description: "displays help",
      },
      {
        option: "version",
        alias: "v",
        type: "Boolean",
        description: "displays version",
      },
      {
        option: "config",
        alias: "c",
        type: "path::String",
        description:
          "Use this configuration, overriding .kanelrc.js config options if present",
      },
      {
        option: "database",
        alias: "d",
        type: "String",
        description:
          "Database connection string. Will override the connection field in the config file if present",
      },
      {
        option: "output",
        alias: "o",
        type: "path::String",
        description:
          "Output directory. Will override the output field in the config file if present",
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

  let config: Config;
  let configPath: string | undefined;
  const configCandidates = options.config
    ? [options.config]
    : [".kanelrc.js", ".kanelrc.cjs", ".kanelrc.json", ".kanelrc.ts"];
  for (const filename of configCandidates) {
    const candidatePath = path.join(process.cwd(), filename);
    if (fs.existsSync(candidatePath)) {
      configPath = candidatePath;
      break;
    }
  }
  if (configPath) {
    console.info(`Using config file: ${configPath}`);
    try {
      config = require(configPath);
    } catch (error) {
      console.error("Could not open config file:", error);
      process.exit(1);
    }
  } else {
    if (options.config) {
      console.error("Could not open " + options.config);
      process.exit(1);
    }
    config = { connection: undefined };
  }

  if (options.database) {
    config.connection = options.database;
  }
  if (!config.connection) {
    console.error("No database specified, in config file or command line");
    process.exit(1);
  }

  if (options.output) {
    config.outputPath = options.output;
  }
  if (!config.outputPath) {
    console.error("No output path specified, in config file or command line");
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
