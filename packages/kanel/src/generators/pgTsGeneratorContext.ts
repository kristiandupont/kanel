/**
 * PgTsGenerator Context
 *
 * This is a generator-specific context that provides configuration
 * for the PostgreSQL to TypeScript generator and its sub-generators.
 *
 * This keeps generator-specific concerns separate from the global KanelContext.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type {
  TypeMetadataV4,
  PropertyMetadataV4,
  RoutineMetadataV4,
} from "../config-types-v4";
import type { CompositeProperty, CompositeDetails } from "./composite-types";
import type { RoutineDetails } from "./routine-types";
import type Details from "../Details";
import type { TypeDeclaration } from "../ts-utilities/ts-declaration-types";
import type TypeMap from "../TypeMap";
import type {
  TableColumn,
  ForeignTableColumn,
  TableDetails,
  ForeignTableDetails,
} from "extract-pg-schema";

/**
 * Internal version of GetMetadataV4.
 * Does NOT include the builtinMetadata parameter - that's handled by the wrapper.
 * This is what sub-generators actually call.
 */
export type InternalGetMetadata = (
  details: Details,
  generateFor: "selector" | "initializer" | "mutator" | undefined
) => TypeMetadataV4;

/**
 * Internal version of GetPropertyMetadataV4.
 * Does NOT include the builtinMetadata parameter - that's handled by the wrapper.
 * This is what sub-generators actually call.
 */
export type InternalGetPropertyMetadata = (
  property: CompositeProperty,
  details: CompositeDetails,
  generateFor: "selector" | "initializer" | "mutator"
) => PropertyMetadataV4;

/**
 * Internal version of GenerateIdentifierTypeV4.
 * Does NOT include the builtinType parameter - that's handled by the wrapper.
 * This is what sub-generators actually call.
 */
export type InternalGenerateIdentifierType = (
  column: TableColumn | ForeignTableColumn,
  details: TableDetails | ForeignTableDetails
) => TypeDeclaration;

/**
 * Internal version of GetRoutineMetadataV4.
 * Does NOT include the builtinMetadata parameter - that's handled by the wrapper.
 * This is what sub-generators actually call.
 */
export type InternalGetRoutineMetadata = (
  routineDetails: RoutineDetails
) => RoutineMetadataV4;

/**
 * Context specific to the PgTsGenerator.
 * Available to all sub-generators via usePgTsGeneratorContext().
 */
export type PgTsGeneratorContext = {
  /** Merged type map (builtin + custom) */
  typeMap: TypeMap;

  /** Internal metadata function (already merged with builtin) */
  getMetadata: InternalGetMetadata;

  /** Internal property metadata function (already merged with builtin) */
  getPropertyMetadata: InternalGetPropertyMetadata;

  /** Optional internal identifier type generator (already merged with builtin) */
  generateIdentifierType?: InternalGenerateIdentifierType;

  /** Optional internal routine metadata function (already merged with builtin) */
  getRoutineMetadata?: InternalGetRoutineMetadata;

  /** Property sort function */
  propertySortFunction: (a: CompositeProperty, b: CompositeProperty) => number;
};

const pgTsGeneratorStorage = new AsyncLocalStorage<PgTsGeneratorContext>();

/**
 * Get the current PgTsGenerator context.
 * Throws if called outside of a PgTsGenerator execution context.
 */
export const usePgTsGeneratorContext = (): PgTsGeneratorContext => {
  const context = pgTsGeneratorStorage.getStore();
  if (!context) {
    throw new Error(
      "PgTsGenerator context not available. " +
        "This function must be called within a PgTsGenerator execution."
    );
  }
  return context;
};

/**
 * Run a function within a PgTsGenerator context.
 */
export const runWithPgTsGeneratorContext = async <T>(
  context: PgTsGeneratorContext,
  fn: () => Promise<T>
): Promise<T> => {
  return pgTsGeneratorStorage.run(context, fn);
};
