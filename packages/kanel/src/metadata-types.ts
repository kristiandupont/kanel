import type {
  ForeignTableColumn,
  ForeignTableDetails,
  TableColumn,
  TableDetails,
} from "extract-pg-schema";

import type { TypeDeclaration } from "./declaration-types";
import type Details from "./Details";
import type {
  CompositeDetails,
  CompositeProperty,
} from "./generators/pg-ts-generator/composite-types";
import type { RoutineDetails } from "./generators/pg-ts-generator/routine-types";
import type TypeDefinition from "./TypeDefinition";

export type TypeMetadata = {
  name: string;
  comment: string[] | undefined;
  path: string;
};

export type GetMetadata = (
  details: Details,
  generateFor: "selector" | "initializer" | "mutator" | undefined,
  defaultResult: TypeMetadata,
) => TypeMetadata;

export type PropertyMetadata = {
  name: string;
  comment: string[] | undefined;
  typeOverride?: TypeDefinition;
  nullableOverride?: boolean;
  optionalOverride?: boolean;
};

export type GetPropertyMetadata = (
  property: CompositeProperty,
  details: CompositeDetails,
  generateFor: "selector" | "initializer" | "mutator",
  defaultResult: PropertyMetadata,
) => PropertyMetadata;

export type GenerateIdentifierType = (
  column: TableColumn | ForeignTableColumn,
  details: TableDetails | ForeignTableDetails,
  defaultResult: TypeDeclaration,
) => TypeDeclaration;

export type RoutineMetadata = {
  path: string;

  parametersName: string;
  parameters: PropertyMetadata[];

  returnTypeName?: string;
  returnTypeComment?: string[] | undefined;
  returnTypeOverride?: TypeDefinition;
};

export type GetRoutineMetadata = (
  routineDetails: RoutineDetails,
  defaultResult: RoutineMetadata,
) => RoutineMetadata;
