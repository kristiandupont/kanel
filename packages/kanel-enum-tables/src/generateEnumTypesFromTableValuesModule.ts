import type {
  EnumDeclaration,
  InterfaceDeclaration,
  Output,
  PreRenderHook,
  TypeDeclaration,
} from "kanel";
import type { TableDetails } from "extract-pg-schema";
import { resolveType } from "kanel";
import knex from "knex";

const generateEnumTypesFromTableValuesModule: PreRenderHook = async (
  outputAccumulator,
  instantiatedConfig,
) => {
  const connection = instantiatedConfig.connection;
  const db = knex({ client: "postgres", connection });

  // Get all the tables in all the schemas and filter the ones that have an "$enum" comment
  const enumTables: TableDetails[] = [];
  const enumRegex = /(^|\b)@enum(\b|$)/;

  for (const schema of Object.values(instantiatedConfig.schemas)) {
    for (const table of schema.tables) {
      if (table.comment !== null && enumRegex.test(table.comment)) {
        enumTables.push(table);
      }
    }
  }

  const overrides: Output = {};

  for (const table of enumTables) {
    const primaryKeyColumn = table.columns.find(
      (column) => column.isPrimaryKey,
    );

    if (!primaryKeyColumn) {
      throw new Error(
        `Table ${table.schemaName}.${table.name} is an enum table but has no primary key`,
      );
    }

    const primaryKeyTypeDeclaration = instantiatedConfig.generateIdentifierType(
      primaryKeyColumn,
      table,
      instantiatedConfig,
    );

    // Get the resolved type for the primary key column
    const primaryKeyInnerType = resolveType(primaryKeyColumn, table, {
      ...instantiatedConfig,
      // Explicitly disable identifier resolution so we get the actual inner type here
      generateIdentifierType: undefined,
    });

    if (primaryKeyInnerType !== "string") {
      // XXX: Should we just warn and skip?
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

    // Extract @enumName from the table comment
    const enumNameMatch = table.comment.match(/@enumName\s+(?<enumName>\S+)/);
    let enumName = enumNameMatch?.groups?.enumName;

    // TODO: There is currently no good way to support @enumDescription because
    // we can't provide a comment per enum value in the EnumDeclaration declaration.
    // We could support this when enumStyle is "type".

    const rows = await db
      .withSchema(table.schemaName)
      .select(primaryKeyColumn.name)
      .from(table.name)
      .orderBy(primaryKeyColumn.name);

    const declarations =
      outputAccumulator[selectorMetadata.path]?.declarations ?? [];

    const newDeclarations = declarations.map((declaration) => {
      if (
        declaration.declarationType === "typeDeclaration" &&
        declaration.name === primaryKeyTypeDeclaration.name
      ) {
        if (instantiatedConfig.enumStyle === "type") {
          const newDeclaration: TypeDeclaration = {
            ...declaration,
            name: enumName || declaration.name,
            typeDefinition: [
              "", // Start definition on new line
              ...rows.map((row) => `| '${row[primaryKeyColumn.name]}'`),
            ],
          };

          return newDeclaration;
        } else if (instantiatedConfig.enumStyle === "enum") {
          const newDeclaration: EnumDeclaration = {
            declarationType: "enum",
            name: enumName || declaration.name,
            comment: declaration.comment,
            exportAs: declaration.exportAs,
            values: rows.map((row) => row[primaryKeyColumn.name]),
            typeImports: declaration.typeImports,
          };

          return newDeclaration;
        }
      } else if (
        declaration.declarationType === "interface" &&
        (declaration.name === initializerMetadata.name ||
          declaration.name === mutatorMetadata.name)
      ) {
        const newDeclaration: InterfaceDeclaration = {
          ...declaration,
          properties: declaration.properties.map((property) => {
            if (property.name === primaryKeyColumn.name) {
              return {
                ...property,
                // TODO: See if there's a way to allow any value except existing enum values.
                // XXX: I don't know if we perhaps should be using primaryKeyTypeDeclaration.typeDefinition
                // instead of primaryKeyInnerType here, to get the brand/flavor as well.
                typeName: primaryKeyInnerType,
                typeImports: [],
              };
            }

            return property;
          }),
        };

        return newDeclaration;
      } else if (
        declaration.declarationType === "interface" &&
        declaration.name === selectorMetadata.name
      ) {
        if (enumName) {
          const newDeclaration: InterfaceDeclaration = {
            ...declaration,
            properties: declaration.properties.map((property) => {
              if (property.name === primaryKeyColumn.name) {
                return {
                  ...property,
                  typeName: enumName,
                  typeImports: [],
                };
              }

              return property;
            }),
          };

          return newDeclaration;
        }
      }

      return declaration;
    });

    overrides[selectorMetadata.path] = {
      declarations: newDeclarations,
    };
  }

  db.destroy();

  return {
    ...outputAccumulator,
    ...overrides,
  };
};

export default generateEnumTypesFromTableValuesModule;
