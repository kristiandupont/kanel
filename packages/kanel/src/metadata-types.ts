import type {
  ForeignTableColumn,
  ForeignTableDetails,
  TableColumn,
  TableDetails,
} from "extract-pg-schema";

import type { InstantiatedConfig } from "./config-types";
import type { TypeDeclaration } from "./declaration-types";
import type Details from "./Details";
import type {
  CompositeDetails,
  CompositeProperty,
} from "./generators/composite-types";
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
