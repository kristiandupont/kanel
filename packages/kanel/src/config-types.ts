import type { PgType, Schema } from "extract-pg-schema";
import type { ConnectionConfig } from "pg";

import type Output from "./Output";
import type { Awaitable } from "./Awaitable";
import type { TsModuleFormat } from "./ts-utilities/TsModuleFormat";
import type Generator from "./generators/Generator";

export type PostgresSource = {
  type: "postgres";
  name: string;
  connection: string | ConnectionConfig;
  schemaNames?: string[];
  typeFilter?: (pgType: PgType) => boolean;
};

export type Source = PostgresSource;

export type InstantiatedPostgresSource = {
  type: "postgres";
  name: string;
  connection: string | ConnectionConfig;

  schemas: Record<string, Schema>;
};

export type InstantiatedSource = InstantiatedPostgresSource;

export type PreRenderHook = (outputAcc: Output) => Awaitable<Output>;

export type PostRenderHook = (
  path: string,
  lines: string[],
) => Awaitable<string[]>;

// #region Config
export type Config = {
  sources: Record<string, Source>;

  // Generators
  generators: Generator[];

  // Hooks
  preRenderHooks?: PreRenderHook[];
  postRenderHooks?: PostRenderHook[];

  // Output configuration
  outputPath: string;
  preDeleteOutputFolder?: boolean;

  // Module format configuration
  tsModuleFormat?: TsModuleFormat | "auto";
};
// #endregion Config
