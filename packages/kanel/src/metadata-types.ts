import type {
  ForeignTableColumn,
  ForeignTableDetails,
  TableColumn,
  TableDetails,
} from "extract-pg-schema";

import type { InstantiatedConfig } from "./config-types";
import type { TypeDeclaration } from "./ts-declaration-types";
import type Details from "./Details";
import type {
  CompositeDetails,
  CompositeProperty,
} from "./generators/composite-types";
import type { RoutineDetails } from "./generators/routine-types";
import type TypeDefinition from "./TypeDefinition";

export type TypeMetadata = {
  name: string;
  comment: string[] | undefined;
  path: string;
};

export type GetMetadata = (
  details: Details,
  generateFor: "selector" | "initializer" | "mutator" | undefined,
  instantiatedConfig: InstantiatedConfig,
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
  instantiatedConfig: InstantiatedConfig,
) => PropertyMetadata;

export type GenerateIdentifierType = (
  column: TableColumn | ForeignTableColumn,
  details: TableDetails | ForeignTableDetails,
  instantiatedConfig: InstantiatedConfig,
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
  instantiatedConfig: InstantiatedConfig,
) => RoutineMetadata;
