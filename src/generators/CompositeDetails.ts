import {
  CompositeTypeDetails,
  MaterializedViewDetails,
  TableDetails,
  ViewDetails,
} from 'extract-pg-schema';

type CompositeDetails =
  | CompositeTypeDetails
  | TableDetails
  | ViewDetails
  | MaterializedViewDetails;

export default CompositeDetails;
