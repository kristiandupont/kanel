import { recase } from "@kristiandupont/recase";
import type { TableDetails } from "extract-pg-schema";
import type { TableColumn } from "extract-pg-schema";
import { usePgTsGeneratorContext, type Details, type Path, type TypeMap } from "kanel";

export type GenerateZodSchemasConfig = {
  getZodSchemaMetadata?: GetZodSchemaMetadata;
  getZodIdentifierMetadata?: GetZodIdentifierMetadata;
  zodTypeMap?: TypeMap;
  castToSchema?: boolean;
};

/**
 * V4 function to determine Zod schema metadata.
 * Uses PgTsGeneratorContext instead of instantiatedConfig.
 */
export type GetZodSchemaMetadata = (
  d: Details,
  generateFor: "selector" | "initializer" | "mutator" | undefined,
) => { name: string; comment?: string[]; path: Path };

const toCamelCase = recase(null, "camel");

/**
 * V4 function to determine Zod identifier metadata.
 * Uses PgTsGeneratorContext instead of instantiatedConfig.
 */
export type GetZodIdentifierMetadata = (
  column: TableColumn,
  details: TableDetails,
) => { name: string; comment?: string[] };

export const defaultGetZodSchemaMetadata: GetZodSchemaMetadata = (
  details,
  generateFor,
) => {
  const pgTsContext = usePgTsGeneratorContext();
  const { path, name: typescriptName } = pgTsContext.getMetadata(
    details,
    generateFor,
  );
  const name = toCamelCase(typescriptName);
  return { path, name };
};

export const defaultGetZodIdentifierMetadata: GetZodIdentifierMetadata = (
  column: TableColumn,
  details: TableDetails,
) => {
  const pgTsContext = usePgTsGeneratorContext();
  if (!pgTsContext.generateIdentifierType) {
    throw new Error(
      "generateIdentifierType is not available in PgTsGeneratorContext",
    );
  }
  const typescriptDeclaration = pgTsContext.generateIdentifierType(
    column,
    details,
  );
  const name = toCamelCase(typescriptDeclaration.name);
  return { name };
};
