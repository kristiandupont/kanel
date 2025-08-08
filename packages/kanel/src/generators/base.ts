import type Output from "../Output";
import type { Details } from "../Details";
import type { TypeMetadata, PropertyMetadata } from "../metadata-types";
import type { TypeDeclaration } from "../declaration-types";
import type { CompositeProperty, CompositeDetails } from "./composite-types";
import type { TableColumn, TableDetails } from "extract-pg-schema";

export type Generator = () => Promise<Output>;

export interface GeneratorConfig {
  source: string;
  customizers?: {
    getEntityMetadata?: (
      details: Details,
      defaultResult: TypeMetadata,
    ) => TypeMetadata;
    getPropertyMetadata?: (
      property: CompositeProperty,
      details: CompositeDetails,
      generateFor: "selector" | "initializer" | "mutator",
      defaultResult: PropertyMetadata,
    ) => PropertyMetadata;
    generateIdentifierType?: (
      column: TableColumn,
      details: TableDetails,
      defaultResult: TypeDeclaration,
    ) => TypeDeclaration;
  };
}

// This will be implemented in the next phase when we extract the current TypeScript generation logic
export const makePgTsGenerator = (config: GeneratorConfig): Generator => {
  return async () => {
    // TODO: Extract current TypeScript generation logic here
    // For now, return empty output
    return {};
  };
};
