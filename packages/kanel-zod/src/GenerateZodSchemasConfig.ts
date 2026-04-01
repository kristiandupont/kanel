import { recase } from "@kristiandupont/recase";
import type { TableDetails } from "extract-pg-schema";
import type { TableColumn } from "extract-pg-schema";
import type { Details, Path, PgTsGeneratorContext, TypeMap } from "kanel";

export type GenerateZodSchemasConfig = {
  getZodSchemaMetadata?: GetZodSchemaMetadata;
  getZodIdentifierMetadata?: GetZodIdentifierMetadata;
  zodTypeMap?: TypeMap;
  castToSchema?: boolean;
};

/**
 * V4 function to determine Zod schema metadata.
 * Receives PgTsGeneratorContext as a parameter.
 */
export type GetZodSchemaMetadata = (
  d: Details,
  generateFor: "selector" | "initializer" | "mutator" | undefined,
  context: PgTsGeneratorContext,
) => { name: string; comment?: string[]; path: Path };

const toCamelCase = recase(null, "camel");

/**
 * V4 function to determine Zod identifier metadata.
 * Receives PgTsGeneratorContext as a parameter.
 */
export type GetZodIdentifierMetadata = (
  column: TableColumn,
  details: TableDetails,
  context: PgTsGeneratorContext,
) => { name: string; comment?: string[] };

export const defaultGetZodSchemaMetadata: GetZodSchemaMetadata = (
  details,
  generateFor,
  context,
) => {
  const { path, name: typescriptName } = context.getMetadata(
    details,
    generateFor,
  );
  const name = toCamelCase(typescriptName);
  return { path, name };
};

export const defaultGetZodIdentifierMetadata: GetZodIdentifierMetadata = (
  column: TableColumn,
  details: TableDetails,
  context,
) => {
  if (!context.generateIdentifierType) {
    throw new Error(
      "generateIdentifierType is not available in PgTsGeneratorContext",
    );
  }
  const typescriptDeclaration = context.generateIdentifierType(column, details);
  const name = toCamelCase(typescriptDeclaration.name);
  return { name };
};
