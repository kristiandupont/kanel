import {
  CompositeTypeAttribute,
  CompositeTypeDetails,
  MaterializedViewColumn,
  MaterializedViewDetails,
  TableColumn,
  TableDetails,
  ViewColumn,
  ViewDetails,
} from 'extract-pg-schema';

export type CompositeDetails =
  | CompositeTypeDetails
  | TableDetails
  | ViewDetails
  | MaterializedViewDetails;

export type CompositeProperty =
  | TableColumn
  | ViewColumn
  | MaterializedViewColumn
  | CompositeTypeAttribute;
