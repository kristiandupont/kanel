import type { PgType, Schema } from "extract-pg-schema";
import type { ConnectionConfig } from "pg";

import type { CompositeProperty } from "./generators/composite-types";
import type {
  GenerateIdentifierType,
  GetMetadata,
  GetPropertyMetadata,
} from "./metadata-types";
import type Output from "./Output";
import type TypeMap from "./TypeMap";

type Awaitable<T> = T | PromiseLike<T>;

export type InstantiatedConfig = {
  connection: string | ConnectionConfig;
  schemas: Record<string, Schema>;
  typeMap: TypeMap;

  getMetadata: GetMetadata;
  getPropertyMetadata: GetPropertyMetadata;
  generateIdentifierType?: GenerateIdentifierType;
  propertySortFunction: (a: CompositeProperty, b: CompositeProperty) => number;

  enumStyle: "enum" | "type";

  outputPath: string;
  preDeleteOutputFolder: boolean;
  resolveViews: boolean;
  importsExtension: ".ts" | ".js" | ".mjs" | ".cjs" | "";
};

export type PreRenderHook = (
  outputAcc: Output,
  instantiatedConfig: InstantiatedConfig,
) => Awaitable<Output>;

export type PostRenderHook = (
  path: string,
  lines: string[],
  instantiatedConfig: InstantiatedConfig,
) => Awaitable<string[]>;

// #region Config
export type Config = {
  connection: string | ConnectionConfig;
  schemas?: string[];
  typeFilter?: (pgType: PgType) => boolean;
  getMetadata?: GetMetadata;
  getPropertyMetadata?: GetPropertyMetadata;
  generateIdentifierType?: GenerateIdentifierType;
  propertySortFunction?: (a: CompositeProperty, b: CompositeProperty) => number;

  enumStyle?: "enum" | "type";

  outputPath?: string;
  preDeleteOutputFolder?: boolean;
  customTypeMap?: TypeMap;
  resolveViews?: boolean;

  preRenderHooks?: PreRenderHook[];
  postRenderHooks?: PostRenderHook[];

  importsExtension?: ".ts" | ".js" | ".mjs" | ".cjs";
};
// #endregion Config
