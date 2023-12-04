import { recase } from "@kristiandupont/recase";
import { TableDetails } from "extract-pg-schema";
import { TableColumn } from "extract-pg-schema";
import { Details, InstantiatedConfig, Path, TypeMap } from "kanel";

export type GenerateZodSchemasConfig = {
  getZodSchemaMetadata: GetZodSchemaMetadata;
  getZodIdentifierMetadata: GetZodIdentifierMetadata;
  zodTypeMap: TypeMap;
  castToSchema: boolean;
};

export type GetZodSchemaMetadata = (
  d: Details,
  generateFor: "selector" | "initializer" | "mutator" | undefined,
  instantiatedConfig: InstantiatedConfig,
) => { name: string; comment?: string[]; path: Path };

const toCamelCase = recase(null, "camel");

export type GetZodIdentifierMetadata = (
  column: TableColumn,
  details: TableDetails,
  instantiatedConfig: InstantiatedConfig,
) => { name: string; comment?: string[] };

export const defaultGetZodSchemaMetadata: GetZodSchemaMetadata = (
  details,
  generateFor,
  instantiatedConfig,
) => {
  const { path, name: typescriptName } = instantiatedConfig.getMetadata(
    details,
    generateFor,
    instantiatedConfig,
  );
  const name = toCamelCase(typescriptName);
  return { path, name };
};

export const defaultGetZodIdentifierMetadata: GetZodIdentifierMetadata = (
  column: TableColumn,
  details: TableDetails,
  instantiatedConfig: InstantiatedConfig,
) => {
  const typescriptDeclaration = instantiatedConfig.generateIdentifierType(
    column,
    details,
    instantiatedConfig,
  );
  const name = toCamelCase(typescriptDeclaration.name);
  return { name };
};
