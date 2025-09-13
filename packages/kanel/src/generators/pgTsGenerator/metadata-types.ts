import type {
  ForeignTableColumn,
  ForeignTableDetails,
  TableColumn,
  TableDetails,
} from "extract-pg-schema";

import type { TypeDeclaration } from "../../ts-utilities/ts-declaration-types";
import type Details from "../../Details";
import type {
  CompositeDetails,
  CompositeProperty,
} from "./sub-generators/composite-types";
import type { RoutineDetails } from "./sub-generators/routine-types";
import type TypeDefinition from "../../ts-utilities/TypeDefinition";

export type TypeMetadata = {
  name: string;
  comment: string[] | undefined;
  path: string;
};

export type GetMetadata = (
  details: Details,
  generateFor: "selector" | "initializer" | "mutator" | undefined,
  defaults: TypeMetadata,
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
  defaults: PropertyMetadata,
) => PropertyMetadata;

export type GenerateIdentifierType = (
  column: TableColumn | ForeignTableColumn,
  details: TableDetails | ForeignTableDetails,
  defaults: TypeDeclaration,
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
  defaults: RoutineMetadata,
) => RoutineMetadata;
