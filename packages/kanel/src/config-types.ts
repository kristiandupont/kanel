import type { PgType, Schema } from "extract-pg-schema";
import type { ConnectionConfig } from "pg";

import type { CompositeProperty } from "./generators/composite-types";
import type {
  GenerateIdentifierType,
  GetMetadata,
  GetPropertyMetadata,
  GetRoutineMetadata,
} from "./metadata-types";
import type Output from "./Output";
import type TypeMap from "./TypeMap";
import type { ConfigV4 } from "./config-types-v4";

type Awaitable<T> = T | PromiseLike<T>;

export type InstantiatedConfig = {
  connection: string | ConnectionConfig;
  schemas: Record<string, Schema>;
  typeMap: TypeMap;

  getMetadata: GetMetadata;
  getPropertyMetadata: GetPropertyMetadata;
  generateIdentifierType?: GenerateIdentifierType;
  getRoutineMetadata?: GetRoutineMetadata;
  propertySortFunction: (a: CompositeProperty, b: CompositeProperty) => number;

  enumStyle: "enum" | "type";

  outputPath: string;
  preDeleteOutputFolder: boolean;
  resolveViews: boolean;
  importsExtension?: ".ts" | ".js" | ".mjs" | ".cjs";
  tsModuleFormat?: "esm" | "commonjs" | "explicit-esm" | "explicit-commonjs";
  fileExtension: ".ts" | ".mts" | ".cts";
};

export type PreRenderHookV3 = (
  outputAcc: Output,
  instantiatedConfig: InstantiatedConfig,
) => Awaitable<Output>;

export type PostRenderHookV3 = (
  path: string,
  lines: string[],
  instantiatedConfig: InstantiatedConfig,
) => Awaitable<string[]>;

// #region Config V3
/**
 * V3 Configuration for Kanel.
 * This is the legacy config format, maintained for backwards compatibility.
 * Distinguished from V4 by the absence of the `generators` field.
 */
export type ConfigV3 = {
  connection: string | ConnectionConfig;
  schemas?: string[];
  typeFilter?: (pgType: PgType) => boolean;
  getMetadata?: GetMetadata;
  getPropertyMetadata?: GetPropertyMetadata;
  generateIdentifierType?: GenerateIdentifierType;
  propertySortFunction?: (a: CompositeProperty, b: CompositeProperty) => number;
  getRoutineMetadata?: GetRoutineMetadata;

  enumStyle?: "enum" | "type";

  outputPath?: string;
  preDeleteOutputFolder?: boolean;
  customTypeMap?: TypeMap;
  resolveViews?: boolean;

  preRenderHooks?: PreRenderHookV3[];
  postRenderHooks?: PostRenderHookV3[];

  /** @deprecated Use tsModuleFormat instead */
  importsExtension?: ".ts" | ".js" | ".mjs" | ".cjs";

  tsModuleFormat?: "esm" | "commonjs" | "explicit-esm" | "explicit-commonjs";
};
// #endregion Config V3

// #region Config Union and Type Guards

// Import V4 config type
export type { ConfigV4 };

/**
 * Union type for both V3 and V4 configs.
 * Use isV3Config() or isV4Config() type guards to distinguish between them.
 */
export type Config = ConfigV3 | ConfigV4;

/**
 * Type guard to check if a config is a V3 config.
 * V3 configs are identified by the absence of the `generators` field.
 */
export function isV3Config(config: Config): config is ConfigV3 {
  return !("generators" in config);
}

/**
 * Type guard to check if a config is a V4 config.
 * V4 configs are identified by the presence of the `generators` field.
 */
export function isV4Config(config: Config): config is ConfigV4 {
  return "generators" in config;
}

// #endregion Config Union and Type Guards
