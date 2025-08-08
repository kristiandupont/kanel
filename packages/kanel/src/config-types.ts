import type { PgType, Schema } from "extract-pg-schema";
import type { ConnectionConfig } from "pg";

import type { CompositeProperty } from "./generators/pg-ts-generator/composite-types";
import type {
  GenerateIdentifierType,
  GetMetadata,
  GetPropertyMetadata,
  GetRoutineMetadata,
} from "./metadata-types";
import type Output from "./Output";
import type TypeMap from "./TypeMap";

type Awaitable<T> = T | PromiseLike<T>;

// New v4 source types
export interface PostgresSource {
  type: "postgres";
  connection: string | ConnectionConfig;
  schemas?: string[];
  typeFilter?: (pgType: PgType) => boolean;
}

export interface InstantiatedPostgresSource {
  type: "postgres";
  connection: string | ConnectionConfig;
  schemas: Record<string, Schema>;
}

export type SourceRegistry = Record<string, PostgresSource>;
export type InstantiatedSourceRegistry = Record<
  string,
  InstantiatedPostgresSource
>;

// New v4 generator type
export type Generator = () => Promise<Output>;

// InstantiatedConfig has been removed in v4 - use context system instead

// Updated hook signatures for v4 (no instantiatedConfig parameter)
export type PreRenderHook = (outputAcc: Output) => Awaitable<Output>;

export type PostRenderHook = (
  path: string,
  lines: string[],
) => Awaitable<string[]>;

// New v4 Config interface
export type Config = {
  // Sources configuration
  sources?: SourceRegistry;

  // Generators
  generators: Generator[];

  // Hooks
  preRenderHooks?: PreRenderHook[];
  postRenderHooks?: PostRenderHook[];

  // Output configuration
  outputPath?: string;
  preDeleteOutputFolder?: boolean;
  resolveViews?: boolean;

  // Module format configuration
  moduleFormat?: "esm" | "commonjs" | "auto";

  // Legacy support for backward compatibility during migration
  connection?: string | ConnectionConfig;
  schemas?: string[];
  typeFilter?: (pgType: PgType) => boolean;
  getMetadata?: GetMetadata;
  getPropertyMetadata?: GetPropertyMetadata;
  generateIdentifierType?: GenerateIdentifierType;
  propertySortFunction?: (a: CompositeProperty, b: CompositeProperty) => number;
  getRoutineMetadata?: GetRoutineMetadata;
  enumStyle?: "enum" | "type";
  customTypeMap?: TypeMap;
  importsExtension?: ".ts" | ".js" | ".mjs" | ".cjs";
};
