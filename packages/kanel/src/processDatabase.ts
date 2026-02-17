import { extractSchemas } from "extract-pg-schema";
import { rimraf } from "rimraf";

import type { Config, InstantiatedConfig } from "./config-types";
import { isV3Config as detectV3Config } from "./config-types";
import { convertV3ConfigToV4 } from "./config-conversion";
import type { ConfigV4, TypescriptConfig } from "./config-types-v4";
import { runWithContext } from "./context";
import {
  defaultGenerateIdentifierType,
  defaultGetMetadata,
  defaultGetPropertyMetadata,
  defaultGetRoutineMetadata,
  defaultPropertySortFunction,
} from "./default-metadata-generators";
import defaultTypeMap from "./defaultTypeMap";
import type Output from "./Output";
import type { TsFileContents, GenericContents } from "./Output";
import renderTsFile from "./ts-utilities/renderTsFile";
import renderMarkdownFile from "./renderMarkdownFile";
import type TypeMap from "./TypeMap";
import writeFile from "./writeFile";

type DerivedExtensions = {
  fileExtension: ".ts" | ".mts" | ".cts";
  importsExtension: "" | ".js" | ".mjs" | ".cjs";
};

/**
 * Merges generator output intelligently based on file type.
 * - TypeScript files: merge declarations arrays
 * - Generic files: concatenate lines arrays
 * - Markdown files: error on conflict (cannot merge template-based files)
 */
function mergeOutput(base: Output, incoming: Output): Output {
  const result = { ...base };

  for (const [path, incomingFile] of Object.entries(incoming)) {
    const existingFile = result[path];

    if (!existingFile) {
      // New file, just add it
      result[path] = incomingFile;
      continue;
    }

    // File exists, need to merge
    if (existingFile.fileType !== incomingFile.fileType) {
      throw new Error(
        `Cannot merge output at path "${path}": ` +
          `file type mismatch (${existingFile.fileType} vs ${incomingFile.fileType})`,
      );
    }

    switch (incomingFile.fileType) {
      case "typescript": {
        const tsExisting = existingFile as TsFileContents;
        const tsIncoming = incomingFile as TsFileContents;
        result[path] = {
          fileType: "typescript",
          declarations: [...tsExisting.declarations, ...tsIncoming.declarations],
        };
        break;
      }

      case "generic": {
        const genericExisting = existingFile as GenericContents;
        const genericIncoming = incomingFile as GenericContents;
        result[path] = {
          fileType: "generic",
          lines: [...genericExisting.lines, ...genericIncoming.lines],
        };
        break;
      }

      case "markdown":
        throw new Error(
          `Cannot merge markdown output at path "${path}": ` +
            `Multiple generators are attempting to write to the same markdown file. ` +
            `Each markdown generator should use a unique output path.`,
        );
    }
  }

  return result;
}

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

const processDatabase = async (cfg: Config): Promise<void> => {
  // If V3 config, convert to V4 first
  let v4Config = cfg;
  let instantiatedConfig: InstantiatedConfig | undefined;

  if (detectV3Config(cfg)) {
    // Extract schemas early for V3 conversion
    const v3ConfigWithDefaults = { ...defaultConfig, ...cfg };
    const schemas = await extractSchemas(v3ConfigWithDefaults.connection, {
      schemas: v3ConfigWithDefaults.schemas,
      typeFilter: v3ConfigWithDefaults.typeFilter, // V3 uses typeFilter
    });

    const typeMap: TypeMap = {
      ...defaultTypeMap,
      ...v3ConfigWithDefaults.customTypeMap,
    };

    if (
      v3ConfigWithDefaults.tsModuleFormat &&
      v3ConfigWithDefaults.importsExtension
    ) {
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
  await processV4Config(v4Config as ConfigV4, instantiatedConfig);
};

/**
 * Process a V4 config.
 * If instantiatedConfig is provided, we're in V3 compatibility mode.
 */
const processV4Config = async (
  v4Config: ConfigV4,
  instantiatedConfig: InstantiatedConfig | undefined,
): Promise<void> => {
  // Resolve typescriptConfig with defaults
  const resolvedTypescriptConfig: TypescriptConfig = {
    enumStyle: "literal-union",
    ...v4Config.typescriptConfig,
  };

  // For V3 compatibility mode, schemas were already extracted during conversion
  // For pure V4 configs, we need to extract them here
  let schemas;
  let fileExtension: ".ts" | ".mts" | ".cts";
  let importsExtension: "" | ".ts" | ".js" | ".mjs" | ".cjs" | undefined;

  if (instantiatedConfig) {
    // V3 compatibility mode - use already extracted data
    schemas = instantiatedConfig.schemas;
    fileExtension = instantiatedConfig.fileExtension;
    importsExtension = instantiatedConfig.importsExtension as any;
  } else {
    // Pure V4 mode - extract schemas directly
    const schemasList = v4Config.schemaNames || ["public"];
    schemas = await extractSchemas(v4Config.connection, {
      schemas: schemasList,
      typeFilter: v4Config.filter, // V4 uses filter
    });

    const derivedExtensions = deriveExtensions(
      resolvedTypescriptConfig.tsModuleFormat,
      resolvedTypescriptConfig.importsExtension,
    );
    fileExtension = derivedExtensions.fileExtension;
    importsExtension = derivedExtensions.importsExtension;
  }

  // Store the resolved importsExtension on typescriptConfig so renderTsFile can use it
  const typescriptConfigWithExtension: TypescriptConfig = {
    ...resolvedTypescriptConfig,
    importsExtension,
  };

  await runWithContext(
    {
      typescriptConfig: typescriptConfigWithExtension,
      config: v4Config,
      schemas,
      instantiatedConfig: instantiatedConfig as any,
    },
    async () => {
      let output: Output = {};

      // Execute each generator sequentially
      for (const generator of v4Config.generators) {
        const generatorOutput = await generator();
        // Merge generator output into accumulated output
        output = mergeOutput(output, generatorOutput);
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
        } else if (file.fileType === "markdown") {
          const lines = renderMarkdownFile(file.template, file.context);
          return { fullPath: path, lines };
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
