import chalk from "chalk";
import fs from "fs";
import optionator from "optionator";
import path from "path";

import type { Config } from "../config-types";
import processDatabase from "../processDatabase";

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
        description: "Use this configuration file, overriding kanel.config.*",
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
    : [
        "kanel.config.js",
        "kanel.config.cjs",
        "kanel.config.json",
        "kanel.config.ts",
      ];
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
      console.error("Configuration file (kanel.config.*) not found");
      process.exit(1);
    }
  }

  try {
    await processDatabase(config);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
