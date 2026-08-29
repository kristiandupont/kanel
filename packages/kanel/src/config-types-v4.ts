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
import type { PgTsGeneratorContext } from "./generators/pgTsGeneratorContext";

type Awaitable<T> = T | PromiseLike<T>;

// #region V4 Core Types

/**
 * General TypeScript output configuration.
 * Affects all TypeScript generators.
 */
export type TypescriptConfig = {
  /** How to generate enums: 'literal-union' (type unions) or 'enum' (TS enums) */
  enumStyle: "literal-union" | "enum";

  /** Module format for TypeScript output */
  tsModuleFormat?: "esm" | "commonjs" | "explicit-esm" | "explicit-commonjs";

  /** Optional explicit imports extension (legacy, use tsModuleFormat instead) */
  importsExtension?: string;
};

/**
 * A generator produces output files.
 * Generators run sequentially and can access context via useKanelContext().
 */
export type Generator = () => Awaitable<Output>;

// #endregion V4 Core Types

// #region V4 Hooks

/**
 * Pre-render hook - transforms accumulated output.
 * Access context via useKanelContext() instead of receiving it as a parameter.
 */
export type PreRenderHook = (outputAcc: Output) => Awaitable<Output>;

/**
 * Post-render hook - transforms rendered file lines.
 * Access context via useKanelContext() instead of receiving it as a parameter.
 */
export type PostRenderHook = (
  path: string,
  lines: string[],
) => Awaitable<string[]>;

/** @deprecated Use PreRenderHook instead */
export type PreRenderHookV4 = PreRenderHook;

/** @deprecated Use PostRenderHook instead */
export type PostRenderHookV4 = PostRenderHook;

/**
 * Pre-render hook scoped to a PgTsGenerator execution.
 * Receives PgTsGeneratorContext as a parameter for type safety.
 * Must be placed in PgTsGeneratorConfig.preRenderHooks — not in the global Config.preRenderHooks.
 */
export type PgTsPreRenderHook = (
  outputAcc: Output,
  context: PgTsGeneratorContext,
) => Awaitable<Output>;

// #endregion V4 Hooks

// #region V4 Metadata Types

/**
 * Metadata result type
 */
export type TypeMetadata = {
  name: string;
  comment: string[] | undefined;
  path: string;
  /** How to export this declaration. Defaults to "default" if not provided. */
  exportAs?: "named" | "default";
};

/**
 * GetMetadata - receives the builtin metadata as the last parameter.
 * This allows composing custom metadata on top of Kanel's builtin implementation.
 * Access context via useKanelContext() instead of instantiatedConfig.
 *
 * @example
 * getMetadata: (details, generateFor, builtinMetadata) => ({
 *   ...builtinMetadata,
 *   comment: ['My custom comment'],
 * })
 */
export type GetMetadata = (
  details: Details,
  generateFor: "selector" | "initializer" | "mutator" | undefined,
  builtinMetadata: TypeMetadata,
) => TypeMetadata;

/**
 * PropertyMetadata result type
 */
export type PropertyMetadata = {
  name: string;
  comment: string[] | undefined;
  typeOverride?: TypeDefinition;
  nullableOverride?: boolean;
  optionalOverride?: boolean;
};

/**
 * GetPropertyMetadata - receives the builtin metadata as the last parameter.
 * This allows composing custom property metadata on top of Kanel's builtin implementation.
 * Access context via useKanelContext() instead of instantiatedConfig.
 *
 * @example
 * getPropertyMetadata: (property, details, generateFor, builtinMetadata) => ({
 *   ...builtinMetadata,
 *   comment: [...(builtinMetadata.comment || []), 'Custom note'],
 * })
 */
export type GetPropertyMetadata = (
  property: CompositeProperty,
  details: CompositeDetails,
  generateFor: "selector" | "initializer" | "mutator",
  builtinMetadata: PropertyMetadata,
) => PropertyMetadata;

/**
 * GenerateIdentifierType - receives the builtin identifier type as the last parameter.
 * This allows composing custom identifier types on top of Kanel's builtin implementation.
 * Access context via useKanelContext() instead of instantiatedConfig.
 *
 * @example
 * generateIdentifierType: (column, details, builtinType) => ({
 *   ...builtinType,
 *   comment: ['Custom ID type comment'],
 * })
 */
export type GenerateIdentifierType = (
  column: TableColumn | ForeignTableColumn,
  details: TableDetails | ForeignTableDetails,
  builtinType: TypeDeclaration,
) => TypeDeclaration;

/**
 * RoutineMetadata result type
 */
export type RoutineMetadata = {
  path: string;
  parametersName: string;
  parameters: PropertyMetadata[];
  returnTypeName?: string;
  returnTypeComment?: string[] | undefined;
  returnTypeOverride?: TypeDefinition;
};

/**
 * GetRoutineMetadata - receives the builtin metadata as the last parameter.
 * This allows composing custom routine metadata on top of Kanel's builtin implementation.
 * Access context via useKanelContext() instead of instantiatedConfig.
 *
 * @example
 * getRoutineMetadata: (routineDetails, builtinMetadata) => ({
 *   ...builtinMetadata,
 *   returnTypeComment: ['Custom return type comment'],
 * })
 */
export type GetRoutineMetadata = (
  routineDetails: RoutineDetails,
  builtinMetadata: RoutineMetadata,
) => RoutineMetadata;

/** @deprecated Use TypeMetadata instead */
export type TypeMetadataV4 = TypeMetadata;

/** @deprecated Use GetMetadata instead */
export type GetMetadataV4 = GetMetadata;

/** @deprecated Use PropertyMetadata instead */
export type PropertyMetadataV4 = PropertyMetadata;

/** @deprecated Use GetPropertyMetadata instead */
export type GetPropertyMetadataV4 = GetPropertyMetadata;

/** @deprecated Use GenerateIdentifierType instead */
export type GenerateIdentifierTypeV4 = GenerateIdentifierType;

/** @deprecated Use RoutineMetadata instead */
export type RoutineMetadataV4 = RoutineMetadata;

/** @deprecated Use GetRoutineMetadata instead */
export type GetRoutineMetadataV4 = GetRoutineMetadata;

// #endregion V4 Metadata Types

// #region PgTsGeneratorConfig

/**
 * Configuration for the PostgreSQL to TypeScript generator.
 * This generator transforms PostgreSQL types into TypeScript types.
 */
export type PgTsGeneratorConfig = {
  /** Custom type mappings from PostgreSQL types to TypeScript types */
  customTypeMap?: TypeMap;

  /** Metadata functions (no instantiatedConfig parameter) */
  getMetadata?: GetMetadata;
  getPropertyMetadata?: GetPropertyMetadata;
  generateIdentifierType?: GenerateIdentifierType | false;
  getRoutineMetadata?: GetRoutineMetadata;

  /** Function to sort properties in generated interfaces */
  propertySortFunction?: (a: CompositeProperty, b: CompositeProperty) => number;

  /** Filter which PostgreSQL types this generator should process */
  filter?: (pgType: PgType) => boolean;

  /** Pre-render hooks specific to this generator. Run within the generator's context. May call usePgTsGeneratorContext(). */
  preRenderHooks?: PgTsPreRenderHook[];
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

  /** Filter which PostgreSQL types to extract from the database */
  filter?: (pgType: PgType) => boolean;

  /** Whether to resolve view definitions */
  resolveViews?: boolean;

  // General TypeScript settings (affects all TS generators)
  typescriptConfig?: TypescriptConfig;

  // Output settings
  outputPath?: string;
  preDeleteOutputFolder?: boolean;

  // Top-level generators and hooks
  generators: Generator[];
  preRenderHooks?: PreRenderHook[];
  postRenderHooks?: PostRenderHook[];
};

// #endregion V4 Config
