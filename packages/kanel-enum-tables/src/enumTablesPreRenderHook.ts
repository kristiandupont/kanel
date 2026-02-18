import type { TableDetails } from "extract-pg-schema";
import type {
  EnumDeclaration,
  GenericDeclaration,
  InterfaceDeclaration,
  Output,
  PreRenderHookV4,
  TsFileContents,
  TypeDeclaration,
} from "kanel";
import { resolveType, useKanelContext, usePgTsGeneratorContext } from "kanel";
import knex from "knex";
import { tryParse } from "tagged-comment-parser";

/**
 * Parse smart comment tags from a database comment string.
 *
 * Supports both Postgraphile's newline-separated format and
 * tagged-comment-parser's colon format:
 *
 * Postgraphile: `E'@enum\n@enumName TypeOfAnimal'`
 * Colon:        `@enum @enumName:TypeOfAnimal`
 *
 * Since tagged-comment-parser doesn't support newline-separated tags,
 * we parse each line individually and merge the results.
 */
export const parseSmartTags = (
  comment: string | null,
): Record<string, string | boolean> => {
  if (!comment) return {};

  const mergedTags: Record<string, string | boolean> = {};

  for (const line of comment.split("\n")) {
    const { tags } = tryParse(line.trim());

    if (tags) {
      Object.assign(mergedTags, tags);
    }
  }

  return mergedTags;
};

/**
 * Resolve the value of a smart tag that may have been parsed as a boolean
 * (Postgraphile space format) instead of a string (colon format).
 *
 * When tagged-comment-parser encounters `@enumName TypeOfAnimal`,
 * it parses `enumName` as `true` and puts "TypeOfAnimal" in the comment.
 * We fall back to regex extraction from the raw comment in that case.
 */
export const resolveTagValue = (
  tags: Record<string, string | boolean>,
  tagName: string,
  rawComment: string,
): string | undefined => {
  const value = tags[tagName];

  if (typeof value === "string") {
    return value;
  }

  if (value === true) {
    // Postgraphile space format — extract value from raw comment
    const match = rawComment.match(new RegExp(`@${tagName}\\s+(\\S+)`));
    return match?.[1];
  }

  return undefined;
};

/**
 * Check if a file has already been processed by kanel-kysely.
 *
 * kanel-kysely replaces selector interfaces with *Table interfaces
 * that use ColumnType<> wrappers, and removes initializer/mutator interfaces.
 * We detect this by looking for ColumnType in type imports.
 */
export const isKyselyProcessed = (declarations: unknown[]): boolean =>
  declarations.some(
    (d: any) =>
      d?.declarationType === "interface" &&
      d?.typeImports?.some(
        (i: any) => i.name === "ColumnType" && i.path === "kysely",
      ),
  );

/**
 * Update a ColumnType<S, I, M> string by replacing all occurrences of
 * the old type name with the new enum type name.
 */
export const updateColumnType = (
  typeName: string,
  oldName: string,
  newName: string,
): string => {
  if (!typeName.startsWith("ColumnType<")) return typeName;

  return typeName.replaceAll(oldName, newName);
};

/**
 * Find the column name marked with @enumDescription in the table's column comments.
 * Returns the column name if found, undefined otherwise.
 */
export const findDescriptionColumn = (
  table: TableDetails,
): string | undefined => {
  for (const column of table.columns) {
    const tags = parseSmartTags(column.comment ?? null);
    if (tags.enumDescription) {
      return column.name;
    }
  }

  return undefined;
};

const enumTablesPreRenderHook: PreRenderHookV4 = async (outputAccumulator) => {
  const { schemas, config, typescriptConfig } = useKanelContext();
  const pgTsContext = usePgTsGeneratorContext();

  if (!pgTsContext.generateIdentifierType) {
    console.warn(
      "kanel-enum-tables: generateIdentifierType is not configured, skipping enum table generation",
    );
    return outputAccumulator;
  }

  // Find all tables tagged with @enum
  const enumTables: Array<{
    table: TableDetails;
    enumName: string | undefined;
    descriptionColumn: string | undefined;
  }> = [];

  for (const schema of Object.values(schemas)) {
    for (const table of schema.tables) {
      const tags = parseSmartTags(table.comment);

      if (tags.enum) {
        enumTables.push({
          table,
          enumName: resolveTagValue(tags, "enumName", table.comment!),
          descriptionColumn: findDescriptionColumn(table),
        });
      }
    }
  }

  if (enumTables.length === 0) {
    return outputAccumulator;
  }

  const connection = config.connection;
  const db = knex({ client: "postgres", connection });

  // Normalize enumStyle: v4 uses "literal-union", v3 used "type" - treat both as non-enum
  const enumStyle = typescriptConfig.enumStyle === "enum" ? "enum" : "type";

  try {
    const overrides: Output = {};

    for (const { table, enumName, descriptionColumn } of enumTables) {
      const primaryKeyColumn = table.columns.find(
        (column) => column.isPrimaryKey,
      );

      if (!primaryKeyColumn) {
        throw new Error(
          `Table ${table.schemaName}.${table.name} is an enum table but has no primary key`,
        );
      }

      const primaryKeyTypeDeclaration = pgTsContext.generateIdentifierType(
        primaryKeyColumn,
        table,
      );

      // Get the resolved type for the primary key column.
      // Pass `true` for retainInnerIdentifierType to skip identifier type
      // wrapping and get the actual underlying type (e.g. "string").
      const primaryKeyInnerType = resolveType(primaryKeyColumn, table, true);

      if (primaryKeyInnerType !== "string") {
        throw new Error(
          `The primary key of enum table ${table.schemaName}.${table.name} must be string-based, got: ${primaryKeyInnerType}`,
        );
      }

      const selectorMetadata = pgTsContext.getMetadata(table, "selector");
      const initializerMetadata = pgTsContext.getMetadata(table, "initializer");
      const mutatorMetadata = pgTsContext.getMetadata(table, "mutator");

      // @enumDescription marks a column whose values provide per-enum-value descriptions.
      // When enumStyle is "type"/"literal-union", descriptions are rendered as inline JSDoc comments.
      // When enumStyle is "enum", we use a GenericDeclaration to emit hand-crafted
      // enum lines with per-value JSDoc comments (since EnumDeclaration.values is string-only).

      const selectColumns = [primaryKeyColumn.name];
      if (descriptionColumn) {
        selectColumns.push(descriptionColumn);
      }

      const rows = await db
        .withSchema(table.schemaName)
        .select(...selectColumns)
        .from(table.name)
        .orderBy(primaryKeyColumn.name);

      const existingFile = outputAccumulator[
        selectorMetadata.path
      ] as TsFileContents;
      const declarations = existingFile?.declarations ?? [];

      const kyselyMode = isKyselyProcessed(declarations);
      const finalEnumName = enumName || primaryKeyTypeDeclaration.name;

      const newDeclarations = declarations.map((declaration: any) => {
        // Replace the identifier TypeDeclaration with enum values
        if (
          declaration.declarationType === "typeDeclaration" &&
          declaration.name === primaryKeyTypeDeclaration.name
        ) {
          if (enumStyle === "type") {
            const typeLines: string[] = [""];
            for (const row of rows) {
              const desc =
                descriptionColumn && row[descriptionColumn]
                  ? String(row[descriptionColumn])
                  : undefined;
              if (desc) {
                typeLines.push(`/** ${desc} */`);
              }
              typeLines.push(`| '${row[primaryKeyColumn.name]}'`);
            }

            const newDeclaration: TypeDeclaration = {
              ...declaration,
              name: finalEnumName,
              typeDefinition: typeLines,
            };

            return newDeclaration;
          } else if (enumStyle === "enum") {
            if (descriptionColumn) {
              // Use GenericDeclaration to emit per-value JSDoc comments
              const lines: string[] = [];

              if (declaration.exportAs === "named") {
                lines.push(`export enum ${finalEnumName} {`);
              } else {
                lines.push(`enum ${finalEnumName} {`);
              }

              for (const row of rows) {
                const value = String(row[primaryKeyColumn.name]);
                const desc = row[descriptionColumn]
                  ? String(row[descriptionColumn])
                  : undefined;
                if (desc) {
                  lines.push(`  /** ${desc} */`);
                }
                // Quote the field name if it contains special characters
                const needsQuote =
                  value.length === 0 ||
                  value.trim() !== value ||
                  !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value);
                const fieldName = needsQuote ? `'${value}'` : value;
                lines.push(`  ${fieldName} = '${value}',`);
              }

              lines.push("};");

              if (declaration.exportAs === "default") {
                lines.push("", `export default ${finalEnumName};`);
              }

              const newDeclaration: GenericDeclaration = {
                declarationType: "generic",
                comment: declaration.comment,
                typeImports: declaration.typeImports,
                lines,
              };

              return newDeclaration;
            }

            const newDeclaration: EnumDeclaration = {
              declarationType: "enum",
              name: finalEnumName,
              comment: declaration.comment,
              exportAs: declaration.exportAs,
              values: rows.map((row) => row[primaryKeyColumn.name]),
              typeImports: declaration.typeImports,
            };

            return newDeclaration;
          } else {
            console.warn(
              `Unsupported enumStyle "${enumStyle}" for enum table ${table.schemaName}.${table.name}`,
            );
          }
        }

        // Handle initializer/mutator interfaces (not present when kanel-kysely runs first)
        if (
          !kyselyMode &&
          declaration.declarationType === "interface" &&
          (declaration.name === initializerMetadata.name ||
            declaration.name === mutatorMetadata.name)
        ) {
          const newDeclaration: InterfaceDeclaration = {
            ...declaration,
            properties: declaration.properties.map(
              (property: InterfaceDeclaration["properties"][number]) => {
                if (property.name === primaryKeyColumn.name) {
                  return {
                    ...property,
                    // When inserting/updating, accept any string as a new enum value
                    typeName: primaryKeyInnerType,
                    typeImports: [],
                  };
                }

                return property;
              },
            ),
          };

          return newDeclaration;
        }

        // Handle selector interface — update PK property when @enumName renames the type
        if (
          !kyselyMode &&
          declaration.declarationType === "interface" &&
          declaration.name === selectorMetadata.name &&
          enumName
        ) {
          const newDeclaration: InterfaceDeclaration = {
            ...declaration,
            properties: declaration.properties.map(
              (property: InterfaceDeclaration["properties"][number]) => {
                if (property.name === primaryKeyColumn.name) {
                  return {
                    ...property,
                    typeName: enumName,
                    typeImports: [],
                  };
                }

                return property;
              },
            ),
          };

          return newDeclaration;
        }

        // Handle kanel-kysely *Table interface — update ColumnType<> references
        if (
          kyselyMode &&
          declaration.declarationType === "interface" &&
          enumName &&
          declaration.typeImports?.some(
            (i: any) => i.name === "ColumnType" && i.path === "kysely",
          )
        ) {
          const oldTypeName = primaryKeyTypeDeclaration.name;

          const newDeclaration: InterfaceDeclaration = {
            ...declaration,
            properties: declaration.properties.map(
              (property: InterfaceDeclaration["properties"][number]) => {
                if (property.name === primaryKeyColumn.name) {
                  return {
                    ...property,
                    typeName: updateColumnType(
                      property.typeName,
                      oldTypeName,
                      enumName,
                    ),
                  };
                }

                return property;
              },
            ),
          };

          return newDeclaration;
        }

        return declaration;
      });

      overrides[selectorMetadata.path] = {
        ...existingFile,
        declarations: newDeclarations,
      } as TsFileContents;
    }

    return {
      ...outputAccumulator,
      ...overrides,
    };
  } finally {
    await db.destroy();
  }
};

export default enumTablesPreRenderHook;
