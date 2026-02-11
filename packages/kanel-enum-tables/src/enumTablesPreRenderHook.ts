import type { TableDetails } from "extract-pg-schema";
import type {
  EnumDeclaration,
  InterfaceDeclaration,
  Output,
  PreRenderHook,
  TsFileContents,
  TypeDeclaration,
} from "kanel";
import { resolveType } from "kanel";
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
const parseSmartTags = (
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
const resolveTagValue = (
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
const isKyselyProcessed = (declarations: unknown[]): boolean =>
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
const updateColumnType = (
  typeName: string,
  oldName: string,
  newName: string,
): string => {
  if (!typeName.startsWith("ColumnType<")) return typeName;

  return typeName.replaceAll(oldName, newName);
};

const enumTablesPreRenderHook: PreRenderHook = async (
  outputAccumulator,
  instantiatedConfig,
) => {
  if (!instantiatedConfig.generateIdentifierType) {
    console.warn(
      "kanel-enum-tables: generateIdentifierType is not configured, skipping enum table generation",
    );
    return outputAccumulator;
  }

  // Find all tables tagged with @enum
  const enumTables: Array<{
    table: TableDetails;
    enumName: string | undefined;
  }> = [];

  for (const schema of Object.values(instantiatedConfig.schemas)) {
    for (const table of schema.tables) {
      const tags = parseSmartTags(table.comment);

      if (tags.enum) {
        enumTables.push({
          table,
          enumName: resolveTagValue(tags, "enumName", table.comment!),
        });
      }
    }
  }

  if (enumTables.length === 0) {
    return outputAccumulator;
  }

  const connection = instantiatedConfig.connection;
  const db = knex({ client: "postgres", connection });

  try {
    const overrides: Output = {};

    for (const { table, enumName } of enumTables) {
      const primaryKeyColumn = table.columns.find(
        (column) => column.isPrimaryKey,
      );

      if (!primaryKeyColumn) {
        throw new Error(
          `Table ${table.schemaName}.${table.name} is an enum table but has no primary key`,
        );
      }

      const primaryKeyTypeDeclaration =
        instantiatedConfig.generateIdentifierType(
          primaryKeyColumn,
          table,
          instantiatedConfig,
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

      const selectorMetadata = instantiatedConfig.getMetadata(
        table,
        "selector",
        instantiatedConfig,
      );

      const initializerMetadata = instantiatedConfig.getMetadata(
        table,
        "initializer",
        instantiatedConfig,
      );

      const mutatorMetadata = instantiatedConfig.getMetadata(
        table,
        "mutator",
        instantiatedConfig,
      );

      // TODO: There is currently no good way to support @enumDescription because
      // we can't provide a comment per enum value in the EnumDeclaration declaration.
      // We could support this when enumStyle is "type".

      const rows = await db
        .withSchema(table.schemaName)
        .select(primaryKeyColumn.name)
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
          if (instantiatedConfig.enumStyle === "type") {
            const newDeclaration: TypeDeclaration = {
              ...declaration,
              name: finalEnumName,
              typeDefinition: [
                "", // Start definition on new line
                ...rows.map((row) => `| '${row[primaryKeyColumn.name]}'`),
              ],
            };

            return newDeclaration;
          } else if (instantiatedConfig.enumStyle === "enum") {
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
              `Unsupported enumStyle "${instantiatedConfig.enumStyle}" for enum table ${table.schemaName}.${table.name}`,
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
