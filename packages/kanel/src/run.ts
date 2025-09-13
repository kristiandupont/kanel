import assert from "node:assert";
import { extractSchemas } from "extract-pg-schema";
import { indexBy } from "ramda";
import { rimraf } from "rimraf";

import type { Config, InstantiatedSource, Source } from "./config-types";
import renderTsFile from "./ts-utilities/renderTsFile";
import writeFile from "./writeFile";
import type { default as Output, FileContents } from "./Output";
import { type KanelContext, runWithContext } from "./context";
import {
  type TsModuleFormat,
  detectTsModuleFormat,
} from "./ts-utilities/TsModuleFormat";

async function instantiateSource(source: Source): Promise<InstantiatedSource> {
  if (source.type === "postgres") {
    const { connection, schemaNames, typeFilter } = source;
    const schemas = await extractSchemas(connection, {
      schemas: schemaNames,
      typeFilter,
    });
    return {
      type: "postgres",
      name: source.name,
      connection: source.connection,
      schemas,
    };
  }
  throw new Error(
    `The source "${source.name}" has an unsupported type: ${source.type}`,
  );
}

function renderFile(fileContents: FileContents, outputPath: string): string[] {
  if (fileContents.filetype === "typescript") {
    return renderTsFile(fileContents, outputPath);
  } else if (fileContents.filetype === "generic") {
    return fileContents.lines;
  }
}

async function run(config: Config): Promise<void> {
  const instantiatedSourceArray = await Promise.all(
    Object.values(config.sources).map(instantiateSource),
  );
  const instantiatedSources = indexBy(
    (source) => source.name,
    instantiatedSourceArray,
  );

  let tsModuleFormat: TsModuleFormat | undefined;
  if (!config.tsModuleFormat || config.tsModuleFormat === "auto") {
    tsModuleFormat = await detectTsModuleFormat();
  } else {
    tsModuleFormat = config.tsModuleFormat;
  }
  assert(tsModuleFormat, "Failed to establish TS module format.");

  const kanelContext: KanelContext = {
    config,
    tsModuleFormat,
    instantiatedSources,
    subContext: undefined,
  };

  await runWithContext(kanelContext, async () => {
    const generatorOutputs = await Promise.all(
      config.generators.map((generator) => generator()),
    );

    let output = generatorOutputs.reduce(
      (acc, output) => ({ ...acc, ...output }),
      {} as Output,
    );

    for (const hook of config.preRenderHooks ?? []) {
      output = await hook(output);
    }

    let filesToWrite = Object.keys(output).map((fullPath) => {
      const lines = renderFile(output[fullPath], fullPath);
      return { fullPath, lines };
    });

    for (const hook of config.postRenderHooks ?? []) {
      filesToWrite = await Promise.all(
        filesToWrite.map(async (file) => {
          const lines = await hook(file.fullPath, file.lines);
          return { ...file, lines };
        }),
      );
    }

    if (config.preDeleteOutputFolder) {
      console.info(`Clearing old files in ${config.outputPath}`);
      await rimraf(config.outputPath, { glob: true });
    }

    filesToWrite.forEach((file) => writeFile(file));
  });
}

export default run;
