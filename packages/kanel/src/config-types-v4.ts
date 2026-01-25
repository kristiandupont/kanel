import type { PgType } from "extract-pg-schema";
import type { ConnectionConfig } from "pg";

import type { CompositeProperty } from "./generators/composite-types";
import type { TypeDeclaration } from "./ts-utilities/ts-declaration-types";
import type Details from "./Details";
import type { CompositeDetails } from "./generators/composite-types";
import type { RoutineDetails } from "./generators/routine-types";
import type TypeDefinition from "./ts-utilities/TypeDefinition";
import type Output from "./Output";
import type TypeMap from "./TypeMap";
import type {
  ForeignTableColumn,
  ForeignTableDetails,
  TableColumn,
  TableDetails,
} from "extract-pg-schema";

type Awaitable<T> = T | PromiseLike<T>;

// #region V4 Core Types

/**
 * General TypeScript output configuration.
 * Affects all TypeScript generators.
 */
export type TypescriptConfig = {
  /** How to generate enums: 'literal' (type unions) or 'enum' (TS enums) */
  enumStyle: "literal" | "enum";

  /** Module format for TypeScript output */
  tsModuleFormat?: "esm" | "commonjs" | "explicit-esm" | "explicit-commonjs";
};

/**
 * A generator produces output files.
 * Generators run sequentially and can access context via useKanelContext().
 */
export type Generator = () => Awaitable<Output>;

// #endregion V4 Core Types

// #region V4 Hooks

/**
 * V4 pre-render hook - transforms accumulated output.
 * Access context via useKanelContext() instead of receiving it as a parameter.
 */
export type PreRenderHookV4 = (outputAcc: Output) => Awaitable<Output>;

/**
 * V4 post-render hook - transforms rendered file lines.
 * Access context via useKanelContext() instead of receiving it as a parameter.
 */
export type PostRenderHookV4 = (
  path: string,
  lines: string[],
) => Awaitable<string[]>;

// #endregion V4 Hooks

// #region V4 Metadata Types

/**
 * V4 metadata result type (unchanged from V3)
 */
export type TypeMetadataV4 = {
  name: string;
  comment: string[] | undefined;
  path: string;
};

/**
 * V4 GetMetadata - receives the builtin metadata as the last parameter.
 * This allows composing custom metadata on top of Kanel's builtin implementation.
 * Access context via useKanelContext() instead of instantiatedConfig.
 *
 * @example
 * getMetadata: (details, generateFor, builtinMetadata) => ({
 *   ...builtinMetadata,
 *   comment: ['My custom comment'],
 * })
 */
export type GetMetadataV4 = (
  details: Details,
  generateFor: "selector" | "initializer" | "mutator" | undefined,
  builtinMetadata: TypeMetadataV4,
) => TypeMetadataV4;

/**
 * V4 PropertyMetadata result type (unchanged from V3)
 */
export type PropertyMetadataV4 = {
  name: string;
  comment: string[] | undefined;
  typeOverride?: TypeDefinition;
  nullableOverride?: boolean;
  optionalOverride?: boolean;
};

/**
 * V4 GetPropertyMetadata - receives the builtin metadata as the last parameter.
 * This allows composing custom property metadata on top of Kanel's builtin implementation.
 * Access context via useKanelContext() instead of instantiatedConfig.
 *
 * @example
 * getPropertyMetadata: (property, details, generateFor, builtinMetadata) => ({
 *   ...builtinMetadata,
 *   comment: [...(builtinMetadata.comment || []), 'Custom note'],
 * })
 */
export type GetPropertyMetadataV4 = (
  property: CompositeProperty,
  details: CompositeDetails,
  generateFor: "selector" | "initializer" | "mutator",
  builtinMetadata: PropertyMetadataV4,
) => PropertyMetadataV4;

/**
 * V4 GenerateIdentifierType - receives the builtin identifier type as the last parameter.
 * This allows composing custom identifier types on top of Kanel's builtin implementation.
 * Access context via useKanelContext() instead of instantiatedConfig.
 *
 * @example
 * generateIdentifierType: (column, details, builtinType) => ({
 *   ...builtinType,
 *   comment: ['Custom ID type comment'],
 * })
 */
export type GenerateIdentifierTypeV4 = (
  column: TableColumn | ForeignTableColumn,
  details: TableDetails | ForeignTableDetails,
  builtinType: TypeDeclaration,
) => TypeDeclaration;

/**
 * V4 RoutineMetadata result type (unchanged from V3)
 */
export type RoutineMetadataV4 = {
  path: string;
  parametersName: string;
  parameters: PropertyMetadataV4[];
  returnTypeName?: string;
  returnTypeComment?: string[] | undefined;
  returnTypeOverride?: TypeDefinition;
};

/**
 * V4 GetRoutineMetadata - receives the builtin metadata as the last parameter.
 * This allows composing custom routine metadata on top of Kanel's builtin implementation.
 * Access context via useKanelContext() instead of instantiatedConfig.
 *
 * @example
 * getRoutineMetadata: (routineDetails, builtinMetadata) => ({
 *   ...builtinMetadata,
 *   returnTypeComment: ['Custom return type comment'],
 * })
 */
export type GetRoutineMetadataV4 = (
  routineDetails: RoutineDetails,
  builtinMetadata: RoutineMetadataV4,
) => RoutineMetadataV4;

// #endregion V4 Metadata Types

// #region PgTsGeneratorConfig

/**
 * Configuration for the PostgreSQL to TypeScript generator.
 * This generator transforms PostgreSQL types into TypeScript types.
 */
export type PgTsGeneratorConfig = {
  /** Custom type mappings from PostgreSQL types to TypeScript types */
  customTypeMap?: TypeMap;

  /** V4 metadata functions (no instantiatedConfig parameter) */
  getMetadata?: GetMetadataV4;
  getPropertyMetadata?: GetPropertyMetadataV4;
  generateIdentifierType?: GenerateIdentifierTypeV4;
  getRoutineMetadata?: GetRoutineMetadataV4;

  /** Function to sort properties in generated interfaces */
  propertySortFunction?: (a: CompositeProperty, b: CompositeProperty) => number;
};

// #endregion PgTsGeneratorConfig

// #region V4 Config

/**
 * V4 Configuration for Kanel.
 * Distinguished from V3 by the presence of the `generators` field.
 */
export type ConfigV4 = {
  // Database connection settings
  connection: string | ConnectionConfig;

  /** Schema names to process. If not provided, all schemas are processed. */
  schemaNames?: string[];

  /** Filter which PostgreSQL types to process */
  typeFilter?: (pgType: PgType) => boolean;

  /** Whether to resolve view definitions */
  resolveViews?: boolean;

  // General TypeScript settings (affects all TS generators)
  typescriptConfig: TypescriptConfig;

  // Output settings
  outputPath?: string;
  preDeleteOutputFolder?: boolean;

  // Top-level generators and hooks
  generators: Generator[];
  preRenderHooks?: PreRenderHookV4[];
  postRenderHooks?: PostRenderHookV4[];
};

// #endregion V4 Config
