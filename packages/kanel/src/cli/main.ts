import fs from "fs";
import path from "path";
import { parseArgs } from "util";

import type { Config } from "../config-types";
import processDatabase from "../processDatabase";

const { version } = require("../../package.json");

const helpText = `Usage: kanel [options]

  -h, --help             displays help
  -v, --version          displays version
  -c, --config path      Use this configuration file, overriding kanel.config.*

Version ${version}`;

export async function main(): Promise<void> {
  // Bright green when writing to a terminal.
  console.info(process.stdout.isTTY ? "\u001B[92mKanel\u001B[39m" : "Kanel");

  let options: { help?: boolean; version?: boolean; config?: string };

  try {
    options = parseArgs({
      args: process.argv.slice(2),
      options: {
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
        config: { type: "string", short: "c" },
      },
    }).values;
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  if (options.help) {
    console.info(helpText);
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
      console.error(`Configuration file (${options.config}) not found`);
    } else {
      console.error("Configuration file (kanel.config.*) not found");
    }
    process.exit(1);
  }

  try {
    await processDatabase(config);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
