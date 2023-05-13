import { Schema } from 'extract-pg-schema';
import { tryParse } from 'tagged-comment-parser';

import SeedData, { ColumnData, RawSeedData, TableData } from './SeedData';

function preprocessData(inputData: RawSeedData, schema: Schema): SeedData {
  const dependencies: Record<string, string[]> = {};
  const tables: Record<string, TableData> = {};

  const tableNames = Object.keys(inputData);

  for (const tableName of tableNames) {
    const dbTable = schema.tables.find((t) => t.name === tableName);
    if (!dbTable) {
      throw new Error(`Table '${tableName}' not found in schema`);
    }
    const inputRows = inputData[tableName];
    const outputTable: TableData = {
      name: tableName,
      rows: [],
    };

    for (const inputRow of inputRows) {
      const outputRow: Record<string, ColumnData> = {};
      const rowNames = Object.keys(inputRow);
      for (const rowName of rowNames) {
        const { tags = {}, comment: columnName = '' } = tryParse(rowName);

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
              reference: `${refTableName}.${inputRow[rowName]}.${reference.columnName}`,
            };
          } else {
            outputRow[columnName] = inputRow[rowName];
          }
        }

        if (tags.ref) {
          if (columnName) {
            outputTable.indexColumn = columnName;
          } else {
            outputRow['@ref'] = inputRow[rowName];
          }
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
