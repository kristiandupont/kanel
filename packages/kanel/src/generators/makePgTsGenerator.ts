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
import { defaultPropertySortFunction } from "../default-metadata-generators";
import defaultTypeMap from "../defaultTypeMap";

// Import the existing V3-style generators (will be used internally)
import makeCompositeGenerator from "./makeCompositeGenerator";
import enumsGenerator from "./enumsGenerator";
import domainsGenerator from "./domainsGenerator";
import rangesGenerator from "./rangesGenerator";
import makeRoutineGenerator from "./makeRoutineGenerator";

// Import generator context
import { runWithPgTsGeneratorContext } from "./pgTsGeneratorContext";
import type { PgTsGeneratorContext } from "./pgTsGeneratorContext";
import {
  wrapGetMetadata,
  wrapGetPropertyMetadata,
  wrapGenerateIdentifierType,
  wrapGetRoutineMetadata,
} from "./wrapWithBuiltin";

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
export function makePgTsGenerator(config: PgTsGeneratorConfig = {}): Generator {
  return async (): Promise<Output> => {
    const kanelContext = useKanelContext();

    // Build the PgTsGenerator context from user config + builtins
    const generatorContext: PgTsGeneratorContext = {
      // Merge type maps
      typeMap: {
        ...defaultTypeMap,
        ...(config.customTypeMap ?? {}),
      },

      // Wrap metadata functions to call builtin first, then user function
      getMetadata: wrapGetMetadata(config.getMetadata),
      getPropertyMetadata: wrapGetPropertyMetadata(config.getPropertyMetadata),
      generateIdentifierType: wrapGenerateIdentifierType(
        config.generateIdentifierType,
      ),
      getRoutineMetadata: wrapGetRoutineMetadata(config.getRoutineMetadata),

      // Property sort function
      propertySortFunction:
        config.propertySortFunction ?? defaultPropertySortFunction,
    };

    // Run sub-generators within the PgTsGenerator context
    return await runWithPgTsGeneratorContext(generatorContext, async () => {
      // Internal sub-generators (these are implementation details, not exposed to users)
      // These generators now use usePgTsGeneratorContext() instead of instantiatedConfig
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
      Object.values(kanelContext.schemas).forEach((schema) => {
        subGenerators.forEach((generator) => {
          output = generator(schema, output);
        });
      });

      return output;
    });
  };
}

export default makePgTsGenerator;
