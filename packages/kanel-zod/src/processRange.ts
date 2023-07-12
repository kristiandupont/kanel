import { RangeDetails } from 'extract-pg-schema';
import { GenericDeclaration, InstantiatedConfig, TypeImport } from 'kanel';

import { GenerateZodSchemasConfig } from './GenerateZodSchemasConfig';

const processRange = (
  r: RangeDetails,
  config: GenerateZodSchemasConfig,
  instantiatedConfig: InstantiatedConfig,
): GenericDeclaration | undefined => {
  const { name } = config.getZodSchemaMetadata(
    r,
    undefined,
    instantiatedConfig,
  );

  const lines: string[] = [`export const ${name} = z.string();`];

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
