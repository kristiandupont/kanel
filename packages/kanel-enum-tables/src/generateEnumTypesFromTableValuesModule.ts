import type {
  GenericDeclaration,
  InterfaceDeclaration,
  Output,
  PreRenderHook,
  TypeDeclaration,
} from 'kanel';
import { escapeName } from 'kanel';
import knex from 'knex';

const generateEnumTypesFromTableValuesModule: PreRenderHook = async (
  outputAccumulator,
  instantiatedConfig
) => {
  const connection = instantiatedConfig.connection;
  const db = knex({ client: 'postgres', connection });

  // Get all the tables in all the schemas
  const allTables = Object.values(instantiatedConfig.schemas)
    .map(({ tables }) => tables)
    .flat();

  // ..and find the ones that have an "@enum" comment.
  const enumTables = allTables.filter(
    (table) => table.comment !== null && table.comment.indexOf('@enum') !== -1
  );

  const overrides: Output = {};

  for (const table of enumTables) {
    const primaryKeyColumns = table.columns.filter(
      (column) => column.isPrimaryKey
    );

    if (primaryKeyColumns.length !== 1) {
      throw new Error(
        `Enum table ${table.schemaName}.${table.name} must have exactly one primary key column`
      );
    }

    const primaryKeyColumn = primaryKeyColumns[0];

    const primaryKeyTypeDeclaration = instantiatedConfig.generateIdentifierType(
      primaryKeyColumn,
      table,
      instantiatedConfig
    );

    const selectorMetadata = instantiatedConfig.getMetadata(
      table,
      'selector',
      instantiatedConfig
    );

    const initializerMetadata = instantiatedConfig.getMetadata(
      table,
      'initializer',
      instantiatedConfig
    );

    const mutatorMetadata = instantiatedConfig.getMetadata(
      table,
      'mutator',
      instantiatedConfig
    );

    const declarations =
      outputAccumulator[selectorMetadata.path]?.declarations ?? [];

    // TODO: Get @enumName and use it as the name of the enum type
    // TODO: Get @enumDescription (default "descritpion") and use it as the comment for the enum type

    const rows = await db
      .withSchema(table.schemaName)
      .select(primaryKeyColumn.name)
      .from(table.name)
      .orderBy(primaryKeyColumn.name);

    const newDeclarations = declarations.map((declaration) => {
      if (
        declaration.declarationType === 'typeDeclaration' &&
        declaration.name === primaryKeyTypeDeclaration.name
      ) {
        if (instantiatedConfig.enumStyle === 'type') {
          const newDeclaration: TypeDeclaration = {
            ...declaration,
            typeDefinition: [
              '', // Start definition on new line
              ...rows.map((row) => `| '${row.name}'`),
            ],
          };

          return newDeclaration;
        } else {
          const newDeclaration: GenericDeclaration = {
            declarationType: 'generic',
            comment: declaration.comment,
            lines: [
              `export enum ${declaration.name} {`,
              ...rows.map(
                (row) => `  ${escapeName(row.name)} = '${row.name}',`
              ),
              '};',
            ],
          };

          return newDeclaration;
        }
      } else if (
        declaration.declarationType === 'interface' &&
        (declaration.name === initializerMetadata.name ||
          declaration.name === mutatorMetadata.name)
      ) {
        const newDeclaration: InterfaceDeclaration = {
          ...declaration,
          properties: declaration.properties.map((property) => {
            if (property.name === 'name') {
              return {
                ...property,
                typeName: 'string',
                typeImports: [],
              };
            }

            return property;
          }),
        };

        return newDeclaration;
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
