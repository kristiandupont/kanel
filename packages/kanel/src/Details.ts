import type {
  CompositeTypeDetails,
  DomainDetails,
  EnumDetails,
  MaterializedViewDetails,
  RangeDetails,
  TableDetails,
  ViewDetails,
} from "extract-pg-schema";

type Details =
  | TableDetails
  | ViewDetails
  | MaterializedViewDetails
  | EnumDetails
  | RangeDetails
  | DomainDetails
  | CompositeTypeDetails;

export default Details;
