import { Details, InstantiatedConfig, Path } from 'kanel';

export type GenerateZodSchemasConfig = {
  getZodSchemaMetadata: GetZodSchemaMetadata;
};

export type GetZodSchemaMetadata = (
  d: Details,
  instantiatedConfig: InstantiatedConfig
) => { name: string; path: Path };
