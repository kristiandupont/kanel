/**
 * PostgreSQL to TypeScript Generator
 *
 * This is the main V4 generator that transforms PostgreSQL types into TypeScript types.
 * The old V3 "generators" (composite, enum, domains, ranges, routines) are now
 * internal sub-generators within this PgTsGenerator.
 */

import type { PgTsGeneratorConfig } from "../config-types-v4";
import type { Generator } from "../config-types-v4";
import { useKanelContext } from "../context";
import type Output from "../Output";
import {
  defaultGetMetadata,
  defaultGetPropertyMetadata,
  defaultGenerateIdentifierType,
  defaultGetRoutineMetadata,
  defaultPropertySortFunction,
} from "../default-metadata-generators";
import defaultTypeMap from "../defaultTypeMap";

// Import the existing V3-style generators (will be used internally)
import makeCompositeGenerator from "./makeCompositeGenerator";
import enumsGenerator from "./enumsGenerator";
import domainsGenerator from "./domainsGenerator";
import rangesGenerator from "./rangesGenerator";
import makeRoutineGenerator from "./makeRoutineGenerator";

/**
 * Creates a PostgreSQL to TypeScript generator.
 *
 * This generator:
 * - Extracts PostgreSQL types from the database schema
 * - Transforms them into TypeScript types
 * - Uses configurable metadata functions for customization
 * - Internally uses sub-generators for different PG types (composite, enum, etc.)
 *
 * @param config - Configuration for the PgTs generator
 * @returns A V4 Generator function
 */
export function makePgTsGenerator(
  config: PgTsGeneratorConfig = {},
): Generator {
  return async (): Promise<Output> => {
    const context = useKanelContext();

    // Merge user config with defaults
    const customTypeMap = {
      ...defaultTypeMap,
      ...(config.customTypeMap ?? {}),
    };

    // For V3 compatibility, we need to use the instantiatedConfig if available
    // For V4, we'll use the context directly
    const { instantiatedConfig } = context;

    // Internal sub-generators (these are implementation details, not exposed to users)
    // These are the old V3-style generators that operate on schemas
    const subGenerators = [
      makeCompositeGenerator("table"),
      makeCompositeGenerator("foreignTable"),
      makeCompositeGenerator("view"),
      makeCompositeGenerator("materializedView"),
      makeCompositeGenerator("compositeType"),
      enumsGenerator,
      rangesGenerator,
      domainsGenerator,
      makeRoutineGenerator("function"),
      makeRoutineGenerator("procedure"),
    ];

    let output: Output = {};

    // Run all sub-generators on each schema
    Object.values(context.schemas).forEach((schema) => {
      subGenerators.forEach((generator) => {
        output = generator(schema, output);
      });
    });

    return output;
  };
}

export default makePgTsGenerator;
