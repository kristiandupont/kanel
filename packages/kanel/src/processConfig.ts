import { rimraf } from "rimraf";

import type { Config, InstantiatedConfig } from "./config-types";
import {
  defaultGenerateIdentifierType,
  defaultGetMetadata,
  defaultGetPropertyMetadata,
  defaultGetRoutineMetadata,
  defaultPropertySortFunction,
} from "./default-metadata-generators";
import defaultTypeMap from "./defaultTypeMap";
import markAsGenerated from "./hooks/markAsGenerated";
import type Output from "./Output";
import render from "./render";
import type TypeMap from "./TypeMap";
import writeFile from "./writeFile";
import { runWithContext } from "./context";
import { instantiateSources } from "./sources";

type Progress = {
  onProgressStart?: (total: number) => void;
  onProgress?: () => void;
  onProgressEnd?: () => void;
};

const defaultConfig: Partial<Config> = {
  getMetadata: defaultGetMetadata,
  getPropertyMetadata: defaultGetPropertyMetadata,
  generateIdentifierType: defaultGenerateIdentifierType,
  propertySortFunction: defaultPropertySortFunction,
  getRoutineMetadata: defaultGetRoutineMetadata,
  outputPath: ".",
  enumStyle: "type",
  resolveViews: true,
  preDeleteOutputFolder: false,
};

const processConfig = async (
  cfg: Config,
  progress?: Progress,
): Promise<void> => {
  const config = { ...defaultConfig, ...cfg };

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

  // Create type map
  const typeMap: TypeMap = {
    ...defaultTypeMap,
    ...config.customTypeMap,
  };

  // Create instantiated config for backward compatibility
  const instantiatedConfig: InstantiatedConfig = {
    sources: instantiatedSources,
    typeMap,
    getMetadata: config.getMetadata,
    getPropertyMetadata: config.getPropertyMetadata,
    generateIdentifierType: config.generateIdentifierType,
    propertySortFunction: config.propertySortFunction,
    getRoutineMetadata: config.getRoutineMetadata,
    enumStyle: config.enumStyle,
    connection: config.connection || "",
    schemas: instantiatedSources.default?.schemas || {},
    outputPath: config.outputPath,
    preDeleteOutputFolder: config.preDeleteOutputFolder,
    resolveViews: config.resolveViews,
    moduleFormat: config.moduleFormat,
  };

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
    let filesToWrite = Object.keys(combinedOutput).map((path) => {
      const fileContents = combinedOutput[path];

      if (fileContents.filetype === "typescript") {
        const lines = render(
          fileContents.declarations,
          path,
          instantiatedConfig,
        );
        return { fullPath: `${path}.ts`, lines };
      } else if (fileContents.filetype === "generic") {
        const lines = fileContents.content.split("\n");
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
    if (instantiatedConfig.preDeleteOutputFolder) {
      console.info(`Clearing old files in ${instantiatedConfig.outputPath}`);
      await rimraf(instantiatedConfig.outputPath, { glob: true });
    }

    // Write files
    filesToWrite.forEach((file) => writeFile(file));
  });
};

export default processConfig;
