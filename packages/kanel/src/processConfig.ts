import { rimraf } from "rimraf";

import type { Config } from "./config-types";
import markAsGenerated from "./hooks/markAsGenerated";
import type Output from "./Output";
import render from "./render";
import writeFile from "./writeFile";
import { runWithContext } from "./context";
import { instantiateSources } from "./sources";
import { getModuleFormat, getOutputExtension } from "./moduleFormat";

type Progress = {
  onProgressStart?: (total: number) => void;
  onProgress?: () => void;
  onProgressEnd?: () => void;
};

const processConfig = async (
  cfg: Config,
  _progress?: Progress,
): Promise<void> => {
  const config = cfg;

  // Handle legacy v3 config during migration
  if (config.connection && !config.sources) {
    // Convert v3 config to v4 format
    config.sources = {
      default: {
        type: "postgres",
        connection: config.connection,
        schemas: config.schemas,
        typeFilter: config.typeFilter,
      },
    };
  }

  if (!config.sources) {
    throw new Error("No sources configured");
  }

  // Instantiate sources (connect to databases and extract schemas)
  const instantiatedSources = await instantiateSources(config.sources);

  // Create context
  const context = {
    config,
    instantiatedSources,
  };

  return runWithContext(context, async () => {
    // Run generators
    const outputs = await Promise.all(
      config.generators.map((generator) => generator()),
    );

    // Combine outputs
    let combinedOutput: Output = {};
    outputs.forEach((output) => {
      combinedOutput = { ...combinedOutput, ...output };
    });

    // Run pre-render hooks
    for (const hook of config.preRenderHooks ?? []) {
      combinedOutput = await hook(combinedOutput);
    }

    // Render and write files
    const moduleFormat = getModuleFormat(config);
    const outputExtension = getOutputExtension(moduleFormat);

    let filesToWrite = Object.keys(combinedOutput).map((path) => {
      const fileContents = combinedOutput[path];
      const lines = render(fileContents, path);

      if (fileContents.filetype === "typescript") {
        return { fullPath: `${path}${outputExtension}`, lines };
      } else if (fileContents.filetype === "generic") {
        return { fullPath: `${path}.${fileContents.extension}`, lines };
      } else {
        throw new Error(`Unknown file type: ${(fileContents as any).filetype}`);
      }
    });

    // Run post-render hooks
    const postRenderHooks = config.postRenderHooks ?? [markAsGenerated];
    for (const hook of postRenderHooks) {
      filesToWrite = await Promise.all(
        filesToWrite.map(async (file) => {
          const lines = await hook(file.fullPath, file.lines);
          return { ...file, lines };
        }),
      );
    }

    // Clean output folder if requested
    if (config.preDeleteOutputFolder) {
      console.info(`Clearing old files in ${config.outputPath}`);
      await rimraf(config.outputPath, { glob: true });
    }

    // Write files
    filesToWrite.forEach((file) => writeFile(file));
  });
};

export default processConfig;
