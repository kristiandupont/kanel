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
  instantiatedConfig: InstantiatedConfig,
  nonCompositeTypeImports: Record<string, TypeImport>
): GenericDeclaration => {
  const { name } = config.getZodSchemaMetadata(c, instantiatedConfig);
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
      let zodType: string = 'z.unknown()';
      if (typeof x === 'string') {
        zodType = zodTypeMap[x];
        if (!zodType) {
          console.error(`kanel-zod: Unknown type for ${name}.${p.name}: ${x}`);
        }
      } else {
        if (p.type.fullName in nonCompositeTypeImports) {
          const x = nonCompositeTypeImports[p.type.fullName];
          typeImports.push(x);
          zodType = x.name;
        } else {
          console.error(
            `kanel-zod: Unknown type for ${name}.${p.name}: ${p.type.fullName}`
          );
        }
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
