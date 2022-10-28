import { EnumDetails } from 'extract-pg-schema';
import { GenericDeclaration, InstantiatedConfig, TypeImport } from 'kanel';

import { GenerateZodSchemasConfig } from './GenerateZodSchemasConfig';

const processEnum = (
  e: EnumDetails,
  config: GenerateZodSchemasConfig,
  instantiatedConfig: InstantiatedConfig
): GenericDeclaration => {
  const { name } = config.getZodSchemaMetadata(e, config, instantiatedConfig);
  const lines: string[] = [
    `export const ${name} = z.enum([`,
    ...e.values.map((v) => `  '${v}',`),
    ']);',
  ];

  const typeImport: TypeImport = {
    name: 'z',
    isDefault: false,
    path: 'zod',
    isAbsolute: true,
    importAsType: false,
  };

  const declaration: GenericDeclaration = {
    declarationType: 'generic',
    comment: [`Zod schema for ${e.name}`],
    typeImports: [typeImport],
    lines,
  };

  return declaration;
};

export default processEnum;
