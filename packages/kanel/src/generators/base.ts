import type { TypescriptFileContents } from "../Output";
import type Output from "../Output";
import type Details from "../Details";
import type { TypeMetadata, PropertyMetadata } from "../metadata-types";
import type { TypeDeclaration } from "../declaration-types";
import type { CompositeProperty, CompositeDetails } from "./composite-types";
import type { TableColumn, TableDetails } from "extract-pg-schema";
import { useKanelContext } from "../context";
import type { Declaration } from "../declaration-types";
import type { Kind } from "extract-pg-schema";

export type Generator = () => Promise<Output>;

export interface GeneratorConfig {
  source: string;
  customizers?: {
    getEntityMetadata?: (
      details: Details,
      defaultResult: TypeMetadata,
    ) => TypeMetadata;
    getPropertyMetadata?: (
      property: CompositeProperty,
      details: CompositeDetails,
      generateFor: "selector" | "initializer" | "mutator",
      defaultResult: PropertyMetadata,
    ) => PropertyMetadata;
    generateIdentifierType?: (
      column: TableColumn,
      details: TableDetails,
      defaultResult: TypeDeclaration,
    ) => TypeDeclaration;
  };
}

// This will be implemented in the next phase when we extract the current TypeScript generation logic
export const makePgTsGenerator =
  (config: GeneratorConfig): Generator =>
  async () => {
    const context = useKanelContext();
    const source = context.instantiatedSources[config.source];
    if (!source || source.type !== "postgres") {
      throw new Error(`Invalid source: ${config.source}`);
    }

    const output: Output = {};

    // Process each schema
    for (const [schemaName, schema] of Object.entries(source.schemas)) {
      // Generate composite types (tables, views, materialized views, composite types)
      const compositeKinds: Kind[] = [
        "table",
        "foreignTable",
        "view",
        "materializedView",
        "compositeType",
      ];

      for (const kind of compositeKinds) {
        const items = schema[`${kind}s`] as CompositeDetails[];
        if (items) {
          for (const item of items) {
            const declarations = generateCompositeDeclarations(item, config);
            if (declarations.length > 0) {
              const path = `${schemaName}/${item.name}`;
              if (!output[path]) {
                output[path] = {
                  filetype: "typescript",
                  declarations: [],
                };
              }
              (output[path] as TypescriptFileContents).declarations.push(
                ...declarations,
              );
            }
          }
        }
      }

      // Generate enums
      if (schema.enums) {
        for (const enumDetails of schema.enums) {
          const declaration = generateEnumDeclaration(enumDetails, config);
          if (declaration) {
            const path = `${schemaName}/${enumDetails.name}`;
            if (!output[path]) {
              output[path] = {
                filetype: "typescript",
                declarations: [],
              };
            }
            (output[path] as TypescriptFileContents).declarations.push(
              declaration,
            );
          }
        }
      }

      // Generate domains
      if (schema.domains) {
        for (const domainDetails of schema.domains) {
          const declaration = generateDomainDeclaration(domainDetails, config);
          if (declaration) {
            const path = `${schemaName}/${domainDetails.name}`;
            if (!output[path]) {
              output[path] = {
                filetype: "typescript",
                declarations: [],
              };
            }
            (output[path] as TypescriptFileContents).declarations.push(
              declaration,
            );
          }
        }
      }

      // Generate ranges
      if (schema.ranges) {
        for (const rangeDetails of schema.ranges) {
          const declaration = generateRangeDeclaration(rangeDetails, config);
          if (declaration) {
            const path = `${schemaName}/${rangeDetails.name}`;
            if (!output[path]) {
              output[path] = {
                filetype: "typescript",
                declarations: [],
              };
            }
            (output[path] as TypescriptFileContents).declarations.push(
              declaration,
            );
          }
        }
      }

      // Generate routines (functions and procedures)
      const routineKinds: ("function" | "procedure")[] = [
        "function",
        "procedure",
      ];
      for (const kind of routineKinds) {
        const routines = schema[`${kind}s`];
        if (routines) {
          for (const routineDetails of routines) {
            const declaration = generateRoutineDeclaration(
              routineDetails,
              config,
            );
            if (declaration) {
              const path = `${schemaName}/${routineDetails.name}`;
              if (!output[path]) {
                output[path] = {
                  filetype: "typescript",
                  declarations: [],
                };
              }
              (output[path] as TypescriptFileContents).declarations.push(
                declaration,
              );
            }
          }
        }
      }
    }

    return output;
  };

// Helper functions to generate declarations (these will be implemented by extracting from existing generators)
function generateCompositeDeclarations(
  _item: CompositeDetails,
  _config: GeneratorConfig,
): Declaration[] {
  // TODO: Extract logic from makeCompositeGenerator
  return [];
}

function generateEnumDeclaration(
  _enumDetails: any,
  _config: GeneratorConfig,
): Declaration | null {
  // TODO: Extract logic from makeEnumsGenerator
  return null;
}

function generateDomainDeclaration(
  _domainDetails: any,
  _config: GeneratorConfig,
): Declaration | null {
  // TODO: Extract logic from makeDomainsGenerator
  return null;
}

function generateRangeDeclaration(
  _rangeDetails: any,
  _config: GeneratorConfig,
): Declaration | null {
  // TODO: Extract logic from makeRangesGenerator
  return null;
}

function generateRoutineDeclaration(
  _routineDetails: any,
  _config: GeneratorConfig,
): Declaration | null {
  // TODO: Extract logic from makeRoutineGenerator
  return null;
}
