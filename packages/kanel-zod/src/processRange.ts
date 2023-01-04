import { RangeDetails } from 'extract-pg-schema';
import { GenericDeclaration, InstantiatedConfig, TypeImport } from 'kanel';

import { GenerateZodSchemasConfig } from './GenerateZodSchemasConfig';
import zodTypeMap from './zodTypeMap';

const processRange = (
  r: RangeDetails,
  config: GenerateZodSchemasConfig,
  instantiatedConfig: InstantiatedConfig
): GenericDeclaration | undefined => {
  const { name } = config.getZodSchemaMetadata(r, instantiatedConfig);
  let tsType = instantiatedConfig.typeMap[r.innerType];
  if (typeof tsType !== 'string') {
    tsType = 'unknown';
  }

  const innerType = zodTypeMap[tsType];

  const lines: string[] = [
    `export const ${name} = z.tuple([${innerType}, ${innerType}]);`,
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
    comment: [`Zod schema for ${r.name}`],
    typeImports: [typeImport],
    lines,
  };

  return declaration;
};

export default processRange;
