import type {
  CompositeTypeDetails,
  DomainDetails,
  EnumDetails,
  FunctionDetails,
  ForeignTableDetails,
  MaterializedViewDetails,
  ProcedureDetails,
  RangeDetails,
  TableDetails,
  ViewDetails,
} from "extract-pg-schema";

type Details =
  | TableDetails
  | ForeignTableDetails
  | ViewDetails
  | MaterializedViewDetails
  | EnumDetails
  | RangeDetails
  | DomainDetails
  | CompositeTypeDetails
  | FunctionDetails
  | ProcedureDetails;

export default Details;
