/**
 * V3 to V4 Config Conversion
 *
 * This module handles converting V3 configs to V4 configs internally,
 * allowing V3 configs to continue working with the V4 processing logic.
 */

import type { Schema } from "extract-pg-schema";
import type {
  ConfigV3,
  InstantiatedConfig,
  PreRenderHookV3,
  PostRenderHookV3,
} from "./config-types";
import type {
  ConfigV4,
  PreRenderHookV4,
  PostRenderHookV4,
  PgTsGeneratorConfig,
  GetMetadataV4,
  GetPropertyMetadataV4,
  GenerateIdentifierTypeV4,
  GetRoutineMetadataV4,
} from "./config-types-v4";
import { useKanelContext } from "./context";
import applyTaggedComments from "./hooks/applyTaggedComments";
import markAsGenerated from "./hooks/markAsGenerated";
import type Output from "./Output";
import makePgTsGenerator from "./generators/makePgTsGenerator";
import type { CompositeProperty } from "./generators/composite-types";
import type TypeMap from "./TypeMap";

/**
 * Options for V3 config conversion
 */
export type V3ConversionOptions = {
  /** Suppress the deprecation warning */
  suppressDeprecationWarning?: boolean;
};

/**
 * Wraps a V3 PreRenderHook to work as a V4 hook.
 * Injects the instantiatedConfig from context.
 */
function wrapV3PreRenderHook(v3Hook: PreRenderHookV3): PreRenderHookV4 {
  return async (output: Output): Promise<Output> => {
    const context = useKanelContext();

    if (!context.instantiatedConfig) {
      throw new Error(
        "Cannot call V3 hook without instantiatedConfig in context. " +
          "This is a bug in the V3 compatibility layer.",
      );
    }

    return v3Hook(output, context.instantiatedConfig);
  };
}

/**
 * Wraps a V3 PostRenderHook to work as a V4 hook.
 * Injects the instantiatedConfig from context.
 */
function wrapV3PostRenderHook(v3Hook: PostRenderHookV3): PostRenderHookV4 {
  return async (path: string, lines: string[]): Promise<string[]> => {
    const context = useKanelContext();

    if (!context.instantiatedConfig) {
      throw new Error(
        "Cannot call V3 hook without instantiatedConfig in context. " +
          "This is a bug in the V3 compatibility layer.",
      );
    }

    return v3Hook(path, lines, context.instantiatedConfig);
  };
}

/**
 * Wraps V3 metadata functions to work as V4 metadata functions.
 * These wrappers inject instantiatedConfig from context and ignore the default parameter.
 */
function wrapV3MetadataFunctions(
  v3Config: ConfigV3,
  instantiatedConfig: InstantiatedConfig,
): Pick<
  PgTsGeneratorConfig,
  | "getMetadata"
  | "getPropertyMetadata"
  | "generateIdentifierType"
  | "getRoutineMetadata"
> {
  const result: Pick<
    PgTsGeneratorConfig,
    | "getMetadata"
    | "getPropertyMetadata"
    | "generateIdentifierType"
    | "getRoutineMetadata"
  > = {};

  // Wrap getMetadata
  if (v3Config.getMetadata) {
    const v3GetMetadata = v3Config.getMetadata;
    result.getMetadata = ((details, generateFor, _defaultMetadata) =>
      v3GetMetadata(details, generateFor, instantiatedConfig)) as GetMetadataV4;
  }

  // Wrap getPropertyMetadata
  if (v3Config.getPropertyMetadata) {
    const v3GetPropertyMetadata = v3Config.getPropertyMetadata;
    result.getPropertyMetadata = ((
      property,
      details,
      generateFor,
      _defaultMetadata,
    ) =>
      v3GetPropertyMetadata(
        property,
        details,
        generateFor,
        instantiatedConfig,
      )) as GetPropertyMetadataV4;
  }

  // Wrap generateIdentifierType
  if (v3Config.generateIdentifierType) {
    const v3GenerateIdentifierType = v3Config.generateIdentifierType;
    result.generateIdentifierType = ((column, details, _defaultType) =>
      v3GenerateIdentifierType(
        column,
        details,
        instantiatedConfig,
      )) as GenerateIdentifierTypeV4;
  }

  // Wrap getRoutineMetadata
  if (v3Config.getRoutineMetadata) {
    const v3GetRoutineMetadata = v3Config.getRoutineMetadata;
    result.getRoutineMetadata = ((routineDetails, _defaultMetadata) =>
      v3GetRoutineMetadata(
        routineDetails,
        instantiatedConfig,
      )) as GetRoutineMetadataV4;
  }

  return result;
}

/**
 * Prints a deprecation warning for V3 configs
 */
function printDeprecationWarning(): void {
  console.warn(
    [
      "Warning: deprecated V3 config format detected.",
      "While V3 configs continue to work for now, please consider migrating to V4.",
    ].join("\n"),
  );
}

/**
 * Converts a V3 config to a V4 config structure.
 *
 * This function:
 * 1. Applies V3-specific defaults
 * 2. Creates a V4 config with wrapped hooks and metadata functions
 * 3. Maintains backwards compatibility through the instantiatedConfig in context
 *
 * @param v3Config - The V3 configuration
 * @param instantiatedConfig - The instantiated V3 config (with resolved defaults)
 * @param schemas - The extracted database schemas
 * @param options - Conversion options
 * @returns A V4 config that wraps the V3 behavior
 */
export function convertV3ConfigToV4(
  v3Config: ConfigV3,
  instantiatedConfig: InstantiatedConfig,
  schemas: Record<string, Schema>,
  options: V3ConversionOptions = {},
): ConfigV4 {
  // Print deprecation warning unless suppressed
  if (!options.suppressDeprecationWarning) {
    printDeprecationWarning();
  }

  // Wrap V3 hooks to inject instantiatedConfig
  const pgTsPreRenderHooks: PreRenderHookV4[] = [];
  const postRenderHooks: PostRenderHookV4[] = [];

  // V3 always applies applyTaggedComments by default (prepended to user hooks)
  pgTsPreRenderHooks.push(wrapV3PreRenderHook(applyTaggedComments));

  // Add user's pre-render hooks (these become PgTsGenerator-specific in V4)
  if (v3Config.preRenderHooks) {
    pgTsPreRenderHooks.push(
      ...v3Config.preRenderHooks.map(wrapV3PreRenderHook),
    );
  }

  // Add user's post-render hooks, or default to [markAsGenerated]
  const userPostRenderHooks = v3Config.postRenderHooks ?? [markAsGenerated];
  postRenderHooks.push(...userPostRenderHooks.map(wrapV3PostRenderHook));

  // Wrap V3 metadata functions to work as V4 functions
  const wrappedMetadata = wrapV3MetadataFunctions(v3Config, instantiatedConfig);

  // Create PgTsGenerator with wrapped V3 metadata and config
  // In V3, all pre-render hooks were global, but they all operated on PgTs output
  // In V4, they become PgTsGenerator-specific hooks
  const generators = [
    makePgTsGenerator({
      customTypeMap: v3Config.customTypeMap,
      ...wrappedMetadata,
      propertySortFunction: v3Config.propertySortFunction,
      preRenderHooks: pgTsPreRenderHooks,
    }),
  ];

  // Build V4 config
  const v4Config: ConfigV4 = {
    connection: v3Config.connection,
    schemaNames: v3Config.schemas,
    filter: v3Config.typeFilter, // V3 typeFilter -> V4 filter
    resolveViews: v3Config.resolveViews ?? true,

    typescriptConfig: {
      // V3's "type" maps to V4's "literal-union"
      enumStyle:
        instantiatedConfig.enumStyle === "type" ? "literal-union" : "enum",
      tsModuleFormat: v3Config.tsModuleFormat,
    },

    outputPath: v3Config.outputPath,
    preDeleteOutputFolder: v3Config.preDeleteOutputFolder,

    generators,
    // V3 pre-render hooks are moved to PgTsGenerator-specific hooks
    // No global pre-render hooks in converted config
    preRenderHooks: undefined,
    postRenderHooks,
  };

  return v4Config;
}

/**
 * Creates additional context data needed for V3 compatibility.
 * This includes the wrapped metadata functions and other V3-specific data.
 */
export function createV3CompatibilityData(
  v3Config: ConfigV3,
  instantiatedConfig: InstantiatedConfig,
): {
  wrappedMetadata: Pick<
    PgTsGeneratorConfig,
    | "getMetadata"
    | "getPropertyMetadata"
    | "generateIdentifierType"
    | "getRoutineMetadata"
  >;
  propertySortFunction: (a: CompositeProperty, b: CompositeProperty) => number;
  customTypeMap: TypeMap;
} {
  return {
    wrappedMetadata: wrapV3MetadataFunctions(v3Config, instantiatedConfig),
    propertySortFunction: v3Config.propertySortFunction,
    customTypeMap: v3Config.customTypeMap,
  };
}
