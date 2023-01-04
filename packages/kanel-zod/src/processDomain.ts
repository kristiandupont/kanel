import { DomainDetails } from 'extract-pg-schema';
import { GenericDeclaration, InstantiatedConfig, TypeImport } from 'kanel';

import { GenerateZodSchemasConfig } from './GenerateZodSchemasConfig';
import zodTypeMap from './zodTypeMap';

const processDomain = (
  d: DomainDetails,
  config: GenerateZodSchemasConfig,
  instantiatedConfig: InstantiatedConfig
): GenericDeclaration | undefined => {
  const { name } = config.getZodSchemaMetadata(d, instantiatedConfig);
  let tsType = instantiatedConfig.typeMap[d.innerType];
  if (typeof tsType !== 'string') {
    tsType = 'unknown';
  }

  const zodType = zodTypeMap[tsType];

  const lines: string[] = [`export const ${name} = ${zodType};`];

  const typeImport: TypeImport = {
    name: 'z',
    isDefault: false,
    path: 'zod',
    isAbsolute: true,
    importAsType: false,
  };

  const declaration: GenericDeclaration = {
    declarationType: 'generic',
    comment: [`Zod schema for ${d.name}`],
    typeImports: [typeImport],
    lines,
  };

  return declaration;
};

export default processDomain;
