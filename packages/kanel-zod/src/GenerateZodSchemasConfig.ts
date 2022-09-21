import { Details, InstantiatedConfig, Path, TypeMap } from 'kanel';

export type GenerateZodSchemasConfig = {
  zodTypeMap: TypeMap;
  getZodSchemaMetadata: GetZodSchemaMetadata;
};

export type GetZodSchemaMetadata = (
  d: Details,
  config: GenerateZodSchemasConfig,
  instantiatedConfig: InstantiatedConfig
) => { name: string; path: Path };
