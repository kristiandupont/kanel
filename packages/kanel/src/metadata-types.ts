import type {
  ForeignTableColumn,
  ForeignTableDetails,
  TableColumn,
  TableDetails,
} from "extract-pg-schema";

import type { InstantiatedConfig } from "./config-types";
import type { TypeDeclaration } from "./ts-utilities/ts-declaration-types";
import type Details from "./Details";
import type {
  CompositeDetails,
  CompositeProperty,
} from "./generators/composite-types";
import type { RoutineDetails } from "./generators/routine-types";
import type TypeDefinition from "./ts-utilities/TypeDefinition";

/** @deprecated V3 type - use the V4 TypeMetadata from config-types-v4 instead */
export type TypeMetadataV3 = {
  name: string;
  comment: string[] | undefined;
  path: string;
};

/** @deprecated V3 type - use the V4 GetMetadata from config-types-v4 instead */
export type GetMetadataV3 = (
  details: Details,
  generateFor: "selector" | "initializer" | "mutator" | undefined,
  instantiatedConfig: InstantiatedConfig,
) => TypeMetadataV3;

/** @deprecated V3 type - use the V4 PropertyMetadata from config-types-v4 instead */
export type PropertyMetadataV3 = {
  name: string;
  comment: string[] | undefined;
  typeOverride?: TypeDefinition;
  nullableOverride?: boolean;
  optionalOverride?: boolean;
};

/** @deprecated V3 type - use the V4 GetPropertyMetadata from config-types-v4 instead */
export type GetPropertyMetadataV3 = (
  property: CompositeProperty,
  details: CompositeDetails,
  generateFor: "selector" | "initializer" | "mutator",
  instantiatedConfig: InstantiatedConfig,
) => PropertyMetadataV3;

/** @deprecated V3 type - use the V4 GenerateIdentifierType from config-types-v4 instead */
export type GenerateIdentifierTypeV3 = (
  column: TableColumn | ForeignTableColumn,
  details: TableDetails | ForeignTableDetails,
  instantiatedConfig: InstantiatedConfig,
) => TypeDeclaration;

/** @deprecated V3 type - use the V4 RoutineMetadata from config-types-v4 instead */
export type RoutineMetadataV3 = {
  path: string;

  parametersName: string;
  parameters: PropertyMetadataV3[];

  returnTypeName?: string;
  returnTypeComment?: string[] | undefined;
  returnTypeOverride?: TypeDefinition;
};

/** @deprecated V3 type - use the V4 GetRoutineMetadata from config-types-v4 instead */
export type GetRoutineMetadataV3 = (
  routineDetails: RoutineDetails,
  instantiatedConfig: InstantiatedConfig,
) => RoutineMetadataV3;
