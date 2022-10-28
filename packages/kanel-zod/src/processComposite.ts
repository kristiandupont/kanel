import {
  escapeName,
  GenericDeclaration,
  InstantiatedConfig,
  TypeImport,
} from 'kanel';
import {
  CompositeDetails,
  CompositeProperty,
} from 'kanel/build/generators/composite-types';

import { GenerateZodSchemasConfig } from './GenerateZodSchemasConfig';
import zodTypeMap from './zodTypeMap';

const processComposite = (
  c: CompositeDetails,
  config: GenerateZodSchemasConfig,
  instantiatedConfig: InstantiatedConfig
): GenericDeclaration => {
  const { name } = config.getZodSchemaMetadata(c, config, instantiatedConfig);
  let properties: CompositeProperty[];
  if (c.kind === 'compositeType') {
    properties = c.attributes;
  } else {
    properties = c.columns;
  }

  const typeImports: TypeImport[] = [
    {
      name: 'z',
      isDefault: false,
      path: 'zod',
      isAbsolute: true,
      importAsType: false,
    },
  ];

  const lines: string[] = [
    `export const ${name} = z.object({`,
    ...properties.map((p) => {
      const x = instantiatedConfig.typeMap[p.type.fullName];
      let zodType: string;
      if (typeof x === 'string') {
        zodType = zodTypeMap[x];
        if (!zodType) {
          console.error(`Unknown type: ${x}`);
        }
      } else {
        zodType = 'z.unknown()';
      }
      return `  ${escapeName(p.name)}: ${zodType},`;
    }),
    '});',
  ];

  const declaration: GenericDeclaration = {
    declarationType: 'generic',
    comment: [`Zod schema for ${c.name}`],
    typeImports,
    lines,
  };

  return declaration;
};

export default processComposite;
