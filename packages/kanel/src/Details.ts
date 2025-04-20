import type {
  CompositeTypeDetails,
  DomainDetails,
  EnumDetails,
  ForeignTableDetails,
  MaterializedViewDetails,
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
  | CompositeTypeDetails;

export default Details;
