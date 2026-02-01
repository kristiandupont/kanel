/**
 * Markdown Documentation Generator
 *
 * Generates markdown documentation for database schemas using Handlebars templates.
 */

import type { Generator } from "../config-types-v4";
import { useKanelContext } from "../context";
import type Output from "../Output";
import type { MarkdownContents } from "../Output";

/**
 * A single markdown generation target.
 * Can generate either a single file or multiple files (one per entity/schema).
 */
export type MarkdownTarget = {
  /** Path to Handlebars template file */
  template: string;

  /** Output path (can include template variables like {{entity.name}}) */
  output: string;

  /** If true, generate one file per entity */
  perEntity?: boolean;

  /** If true, generate one file per schema */
  perSchema?: boolean;

  /** Filter which entities to generate for (only used with perEntity) */
  filter?: (entity: any) => boolean;
};

/**
 * Configuration for the markdown documentation generator
 */
export type MarkdownGeneratorConfig = {
  /** List of generation targets */
  targets: MarkdownTarget[];
};

/**
 * Interpolates template variables in a string.
 * Supports simple patterns like {{entity.name}} or {{schema.name}}
 */
function interpolate(template: string, data: any): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = path
      .split(".")
      .reduce((obj: any, key: string) => obj?.[key], data);
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Extracts all entities from schemas with metadata
 */
function extractEntities(schemas: Record<string, any>): any[] {
  const entities: any[] = [];

  Object.entries(schemas).forEach(([schemaName, schema]) => {
    // Tables
    schema.tables?.forEach((table: any) => {
      entities.push({
        type: "table",
        schema: schemaName,
        name: table.name,
        ...table,
      });
    });

    // Views
    schema.views?.forEach((view: any) => {
      entities.push({
        type: "view",
        schema: schemaName,
        name: view.name,
        ...view,
      });
    });

    // Materialized views
    schema.materializedViews?.forEach((view: any) => {
      entities.push({
        type: "materializedView",
        schema: schemaName,
        name: view.name,
        ...view,
      });
    });

    // Composite types
    schema.compositeTypes?.forEach((type: any) => {
      entities.push({
        type: "compositeType",
        schema: schemaName,
        name: type.name,
        ...type,
      });
    });

    // Enums
    schema.enums?.forEach((enumType: any) => {
      entities.push({
        type: "enum",
        schema: schemaName,
        name: enumType.name,
        ...enumType,
      });
    });

    // Domains
    schema.domains?.forEach((domain: any) => {
      entities.push({
        type: "domain",
        schema: schemaName,
        name: domain.name,
        ...domain,
      });
    });

    // Ranges
    schema.ranges?.forEach((range: any) => {
      entities.push({
        type: "range",
        schema: schemaName,
        name: range.name,
        ...range,
      });
    });

    // Functions
    schema.functions?.forEach((fn: any) => {
      entities.push({
        type: "function",
        schema: schemaName,
        name: fn.name,
        ...fn,
      });
    });

    // Procedures
    schema.procedures?.forEach((proc: any) => {
      entities.push({
        type: "procedure",
        schema: schemaName,
        name: proc.name,
        ...proc,
      });
    });
  });

  return entities;
}

/**
 * Creates a markdown documentation generator.
 *
 * @param config - Configuration for markdown generation
 * @returns A V4 Generator function
 */
export function makeMarkdownGenerator(
  config: MarkdownGeneratorConfig,
): Generator {
  return async (): Promise<Output> => {
    const kanelContext = useKanelContext();
    const output: Output = {};

    // Prepare full metadata context that all templates can access
    const metadata = {
      schemas: kanelContext.schemas,
      entities: extractEntities(kanelContext.schemas),
    };

    // Process each target
    for (const target of config.targets) {
      if (target.perEntity) {
        // Generate one file per entity
        const entities = target.filter
          ? metadata.entities.filter(target.filter)
          : metadata.entities;

        entities.forEach((entity) => {
          const outputPath = interpolate(target.output, { entity });
          const markdownContent: MarkdownContents = {
            fileType: "markdown",
            template: target.template,
            context: {
              metadata,
              entity,
            },
          };
          output[outputPath] = markdownContent;
        });
      } else if (target.perSchema) {
        // Generate one file per schema
        Object.entries(kanelContext.schemas).forEach(
          ([schemaName, schemaData]) => {
            const schema = { name: schemaName, ...schemaData };
            const outputPath = interpolate(target.output, { schema });
            const markdownContent: MarkdownContents = {
              fileType: "markdown",
              template: target.template,
              context: {
                metadata,
                schema,
              },
            };
            output[outputPath] = markdownContent;
          },
        );
      } else {
        // Generate a single file
        const markdownContent: MarkdownContents = {
          fileType: "markdown",
          template: target.template,
          context: {
            metadata,
          },
        };
        output[target.output] = markdownContent;
      }
    }

    return output;
  };
}

export default makeMarkdownGenerator;
