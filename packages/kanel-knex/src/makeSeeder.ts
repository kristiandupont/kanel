import { Knex } from 'knex';

import SeedData, { TableData } from './SeedData';

const mapObject = <T, U>(obj: Record<string, T>, fn: (v: T) => U) => {
  const result: Record<string, U> = {};
  for (const key of Object.keys(obj)) {
    result[key] = fn(obj[key]);
  }
  return result;
};

// Turn `abc` into a plain string, and `{ "x": 1 }` into an object.
const unBackTick = (v: string) => {
  let s: string | any = v;
  if (v.indexOf('`') === 0) {
    const unStringed = v.slice(1, -1);
    s = JSON.parse(unStringed);
  }
  return s;
};

type TableEntity = {
  [rowRef: string]: {
    [columnName: string]: any;
  };
};

type EntityMap = {
  [tableName: string]: TableEntity;
};

const addTable = async (
  knex: Knex,
  tableData: TableData,
  entityMap: EntityMap
): Promise<TableEntity> => {
  const initializers = tableData.rows.map((row) => {
    const values = mapObject(row, (columnData) => {
      if (typeof columnData === 'string') {
        return unBackTick(columnData);
      } else {
        const reference = columnData.reference;
        const [tableName, rowRef, columnName] = reference.split('.');
        if (!entityMap[tableName]) {
          throw new Error(
            `Table '${tableName}' (referenced as '${reference}') not found`
          );
        }
        if (!entityMap[tableName][rowRef]) {
          throw new Error(
            `Row '${rowRef}' in table '${tableName}' (referenced as '${reference}') not found`
          );
        }
        if (!entityMap[tableName][rowRef][columnName]) {
          throw new Error(
            `Column '${columnName}' in row '${rowRef}' in table '${tableName}' (referenced as '${reference}') not found`
          );
        }

        const value = entityMap[tableName][rowRef][columnName];
        return value;
      }
    });
    if (values['@ref']) {
      delete values['@ref'];
    }

    return values;
  });

  const objects: Record<string, any>[] = await knex(tableData.name)
    .returning('*')
    .insert(initializers);

  const result: TableEntity = {};
  for (const [i, object] of objects.entries()) {
    let rowRef = String(i);
    if (tableData.indexColumn) {
      rowRef = object[tableData.indexColumn];
    } else if (tableData.rows[i]['@ref']) {
      rowRef = tableData.rows[i]['@ref'] as string;
    }
    result[rowRef] = object;
  }

  return result;
};

const makeSeeder =
  ({ data }: { data: SeedData }) =>
  async (knex: Knex): Promise<void> => {
    let entityMap: EntityMap = {};

    for (const tableData of data) {
      const tableValue = await addTable(knex, tableData, entityMap);
      entityMap = {
        ...entityMap,
        [tableData.name]: tableValue,
      };
    }
  };

export default makeSeeder;
