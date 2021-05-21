import { CompositeType, TableOrView } from 'extract-pg-schema';

export type TableModel = TableOrView & {
  type: 'table';
};

export type ViewModel = TableOrView & {
  type: 'view';
};

export type CompositeTypeModel = CompositeType & {
  type: 'composite';
};

export type Model = TableModel | ViewModel | CompositeTypeModel;
