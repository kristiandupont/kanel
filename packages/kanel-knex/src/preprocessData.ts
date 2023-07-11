import { Schema } from 'extract-pg-schema';
import { tryParse } from 'tagged-comment-parser';

import SeedData, { ColumnData, RawSeedData, TableData } from './SeedData';

function preprocessData(
  inputData: RawSeedData,
  schema: Schema,
  defaults: Record<string, string>
): SeedData {
  const dependencies: Record<string, string[]> = {};
  const tables: Record<string, TableData> = {};

  const tableNames = Object.keys(inputData);

  for (const tableName of tableNames) {
    const dbTable = schema.tables.find((t) => t.name === tableName);
    if (!dbTable) {
      throw new Error(`Table '${tableName}' not found in schema`);
    }

    const requiredColumns = dbTable.columns.filter(
      (c) => !c.isNullable && !c.isIdentity && !c.defaultValue
    );

    const inputRows = inputData[tableName];
    const outputTable: TableData = {
      name: tableName,
      rows: [],
    };

    const defaultRow = {};
    for (const defaultName of Object.keys(defaults)) {
      const [table, column] = defaultName.split('.');

      if (table === tableName) {
        defaultRow[column] = defaults[defaultName];
      } else if (
        table === '*' &&
        dbTable.columns.some((c) => c.name === column)
      ) {
        defaultRow[column] = defaults[defaultName];
      }
    }

    for (const inputRow of inputRows) {
      const outputRow: Record<string, ColumnData> = { ...defaultRow };
      const propNames = Object.keys(inputRow);
      for (const propName of propNames) {
        const { tags = {}, comment: columnName = '' } = tryParse(propName);

        // The "column" might be only a @ref tag, so only add it if it has a name.
        if (columnName) {
          const dbColumn = dbTable.columns.find((c) => c.name === columnName);
          if (!dbColumn) {
            throw new Error(
              `Column '${columnName}' not found in table '${tableName}'`
            );
          }

          if (dbColumn.references.length > 0) {
            const [reference] = dbColumn.references;
            const refTableName = reference.tableName;
            if (!dependencies[refTableName]) {
              dependencies[refTableName] = [];
            }
            dependencies[refTableName].push(tableName);

            outputRow[columnName] = {
              reference: `${refTableName}.${inputRow[propName]}.${reference.columnName}`,
            };
          } else {
            outputRow[columnName] = inputRow[propName];
          }
        }

        if (tags.ref) {
          if (columnName) {
            outputTable.indexColumn = columnName;
          } else {
            outputRow['@ref'] = inputRow[propName];
          }
        }
      }

      for (const requiredColumn of requiredColumns) {
        if (!outputRow[requiredColumn.name]) {
          throw new Error(
            `Required column '${requiredColumn.name}' not found in table '${tableName}'`
          );
        }
      }

      outputTable.rows.push(outputRow);
    }

    tables[tableName] = outputTable;
  }

  const tablesOrderedByDependency = Object.keys(tables).sort((a, b) => {
    const aDeps = dependencies[a] || [];
    const bDeps = dependencies[b] || [];

    if (aDeps.includes(b)) {
      return -1;
    }

    if (bDeps.includes(a)) {
      return 1;
    }

    return 0;
  });

  const result: SeedData = tablesOrderedByDependency.map(
    (tableName) => tables[tableName]
  );

  return result;
}

export default preprocessData;
