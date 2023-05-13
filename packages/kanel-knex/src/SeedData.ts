export type RawSeedData = {
  [tableName: string]: {
    [taggedColumnName: string]: string;
  }[];
};

type tableName = string;
type rowRef = string;
type columnName = string;

export type ColumnData =
  | string
  | {
      reference: `${tableName}.${rowRef}.${columnName}`;
    };

export type TableData = {
  name: string;
  indexColumn?: string;
  rows: {
    [columnName: string]: ColumnData;
  }[];
};

type SeedData = TableData[];

export default SeedData;
