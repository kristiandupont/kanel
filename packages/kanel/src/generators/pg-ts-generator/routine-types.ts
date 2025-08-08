import type { FunctionDetails } from "extract-pg-schema";
import type { ProcedureDetails } from "extract-pg-schema";

export type RoutineDetails = FunctionDetails | ProcedureDetails;
