import { extractSchemas } from "extract-pg-schema";
import { rimraf } from "rimraf";

import type { Config, ConfigV3, InstantiatedConfig, PreRenderHook } from "./config-types";
import { isV3Config as detectV3Config } from "./config-types";
import { convertV3ConfigToV4 } from "./config-conversion";

type DerivedExtensions = {
  fileExtension: ".ts" | ".mts" | ".cts";
  importsExtension: "" | ".js" | ".mjs" | ".cjs";
};

const deriveExtensions = (
  tsModuleFormat:
    | "esm"
    | "commonjs"
    | "explicit-esm"
    | "explicit-commonjs"
    | undefined,
  importsExtension: string | undefined,
): DerivedExtensions => {
  // If importsExtension is explicitly set, use legacy behavior
  if (importsExtension) {
    return {
      fileExtension: ".ts",
      importsExtension: importsExtension as "" | ".js" | ".mjs" | ".cjs",
    };
  }

  // Derive from tsModuleFormat
  switch (tsModuleFormat) {
    case "esm":
      return { fileExtension: ".ts", importsExtension: ".js" };
    case "commonjs":
      return { fileExtension: ".ts", importsExtension: "" };
    case "explicit-esm":
      return { fileExtension: ".mts", importsExtension: ".mjs" };
    case "explicit-commonjs":
      return { fileExtension: ".cts", importsExtension: ".cjs" };
    default:
      // Default to .ts with no extension for backwards compatibility
      return { fileExtension: ".ts", importsExtension: "" };
  }
};
import { runWithContext } from "./context";
import {
  defaultGenerateIdentifierType,
  defaultGetMetadata,
  defaultGetPropertyMetadata,
  defaultGetRoutineMetadata,
  defaultPropertySortFunction,
} from "./default-metadata-generators";
import defaultTypeMap from "./defaultTypeMap";
import makeCompositeGenerator from "./generators/makeCompositeGenerator";
import domainsGenerator from "./generators/domainsGenerator";
import enumsGenerator from "./generators/enumsGenerator";
import rangesGenerator from "./generators/rangesGenerator";
import makeRoutineGenerator from "./generators/makeRoutineGenerator";
import applyTaggedComments from "./hooks/applyTaggedComments";
import markAsGenerated from "./hooks/markAsGenerated";
import type Output from "./Output";
import renderTsFile from "./ts-utilities/renderTsFile";
import type TypeMap from "./TypeMap";
import writeFile from "./writeFile";

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
  enumStyle: "enum",
  resolveViews: true,
  preDeleteOutputFolder: false,
};

const processDatabase = async (
  cfg: Config,
  progress?: Progress,
): Promise<void> => {
  // If V3 config, convert to V4 first
  let v4Config = cfg;
  let instantiatedConfig: InstantiatedConfig | undefined;

  if (detectV3Config(cfg)) {
    // Extract schemas early for V3 conversion
    const v3ConfigWithDefaults = { ...defaultConfig, ...cfg };
    const schemas = await extractSchemas(v3ConfigWithDefaults.connection, {
      schemas: v3ConfigWithDefaults.schemas,
      typeFilter: v3ConfigWithDefaults.typeFilter,
      ...progress,
    });

    const typeMap: TypeMap = {
      ...defaultTypeMap,
      ...v3ConfigWithDefaults.customTypeMap,
    };

    if (v3ConfigWithDefaults.tsModuleFormat && v3ConfigWithDefaults.importsExtension) {
      throw new Error(
        "Cannot use both tsModuleFormat and importsExtension at the same time",
      );
    }

    const { fileExtension, importsExtension } = deriveExtensions(
      v3ConfigWithDefaults.tsModuleFormat,
      v3ConfigWithDefaults.importsExtension,
    );

    instantiatedConfig = {
      getMetadata: v3ConfigWithDefaults.getMetadata,
      getPropertyMetadata: v3ConfigWithDefaults.getPropertyMetadata,
      generateIdentifierType: v3ConfigWithDefaults.generateIdentifierType,
      propertySortFunction: v3ConfigWithDefaults.propertySortFunction,
      getRoutineMetadata: v3ConfigWithDefaults.getRoutineMetadata,
      enumStyle: v3ConfigWithDefaults.enumStyle,
      typeMap,
      schemas,
      connection: v3ConfigWithDefaults.connection,
      outputPath: v3ConfigWithDefaults.outputPath,
      preDeleteOutputFolder: v3ConfigWithDefaults.preDeleteOutputFolder,
      resolveViews: v3ConfigWithDefaults.resolveViews,
      importsExtension: importsExtension || undefined,
      tsModuleFormat: v3ConfigWithDefaults.tsModuleFormat,
      fileExtension,
    };

    // Convert V3 → V4
    v4Config = convertV3ConfigToV4(cfg, instantiatedConfig, schemas);
  }

  // From here on, only V4 processing
  await processV4Config(v4Config, instantiatedConfig, progress);
};

/**
 * Process a V4 config.
 * If instantiatedConfig is provided, we're in V3 compatibility mode.
 *
 * Note: Full V4 implementation (with makePgTsGenerator) will be in Phase 4.
 * For now, this runs the old V3-style generators but uses V4 hooks.
 */
const processV4Config = async (
  v4Config: Config,
  instantiatedConfig: InstantiatedConfig | undefined,
  progress?: Progress,
): Promise<void> => {
  // For V3 compatibility mode, schemas were already extracted during conversion
  // For pure V4 configs (future), we'll need to extract them here
  let schemas;
  let fileExtension: ".ts" | ".mts" | ".cts";

  if (instantiatedConfig) {
    // V3 compatibility mode - use already extracted data
    schemas = instantiatedConfig.schemas;
    fileExtension = instantiatedConfig.fileExtension;
  } else {
    // Pure V4 mode (not yet implemented)
    throw new Error(
      "Pure V4 config format is not yet fully implemented. " +
      "V4 will be available in a future release. " +
      "For now, please use V3 config format (without the 'generators' field)."
    );
  }

  // Type guard to ensure we have typescriptConfig
  if (!("typescriptConfig" in v4Config)) {
    throw new Error("Invalid V4 config: missing typescriptConfig");
  }

  await runWithContext(
    {
      typescriptConfig: v4Config.typescriptConfig,
      config: v4Config,
      schemas,
      instantiatedConfig, // Only present for V3 compatibility
    },
    async () => {
      // Run V4 generators from config
      if (!("generators" in v4Config)) {
        throw new Error("V4 config must have generators field");
      }

      let output: Output = {};

      // Execute each generator sequentially
      for (const generator of v4Config.generators) {
        const generatorOutput = await generator();
        // Merge generator output into accumulated output
        output = { ...output, ...generatorOutput };
      }

      // V4 pre-render hooks (no instantiatedConfig parameter)
      const preRenderHooks = v4Config.preRenderHooks ?? [];
      for (const hook of preRenderHooks) {
        output = await hook(output);
      }

      let filesToWrite = Object.keys(output).map((path) => {
        const file = output[path];

        if (!file.fileType) {
          // Hack for backwards compatibility.
          file.fileType = "typescript";
        }

        if (file.fileType === "typescript") {
          const lines = renderTsFile(file.declarations, path);
          return {
            fullPath: `${path}${fileExtension}`,
            lines,
          };
        } else if (file.fileType === "generic") {
          return { fullPath: path, lines: file.lines };
        }
        throw new Error(`Path ${path} is an unknown file type`);
      });

      // V4 post-render hooks (no instantiatedConfig parameter)
      const postRenderHooks = v4Config.postRenderHooks ?? [];
      for (const hook of postRenderHooks) {
        filesToWrite = await Promise.all(
          filesToWrite.map(async (file) => {
            const lines = await hook(file.fullPath, file.lines);
            return { ...file, lines };
          }),
        );
      }

      const outputPath = v4Config.outputPath || ".";
      const preDeleteOutputFolder = v4Config.preDeleteOutputFolder ?? false;

      if (preDeleteOutputFolder) {
        console.info(`Clearing old files in ${outputPath}`);
        await rimraf(outputPath, { glob: true });
      }

      filesToWrite.forEach((file) => writeFile(file));
    },
  );
};

export default processDatabase;
