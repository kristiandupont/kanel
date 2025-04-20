import type {
  CompositeTypeAttribute,
  CompositeTypeDetails,
  ForeignTableColumn,
  ForeignTableDetails,
  MaterializedViewColumn,
  MaterializedViewDetails,
  TableColumn,
  TableDetails,
  ViewColumn,
  ViewDetails,
} from "extract-pg-schema";

export type CompositeDetails =
  | CompositeTypeDetails
  | TableDetails
  | ForeignTableDetails
  | ViewDetails
  | MaterializedViewDetails
  | ForeignTableDetails;

export type CompositeProperty =
  | TableColumn
  | ForeignTableColumn
  | ViewColumn
  | MaterializedViewColumn
  | CompositeTypeAttribute;
