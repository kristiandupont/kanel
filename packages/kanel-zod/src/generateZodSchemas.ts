import { recase } from '@kristiandupont/recase';
import { DomainDetails, EnumDetails, RangeDetails } from 'extract-pg-schema';
import {
  Declaration,
  Details,
  escapeName,
  GenericDeclaration,
  InstantiatedConfig,
  Output,
  Path,
  PreRenderHook,
  TypeImport,
  TypeMap,
} from 'kanel';
import {
  CompositeDetails,
  CompositeProperty,
} from 'kanel/build/generators/composite-types';

import zodTypeMap from './zodTypeMap';

const toCamelCase = recase(null, 'camel');

type Config = {
  typeMap: TypeMap;
  getZodSchemaMetadata: (
    d: Details,
    config: Config,
    instantiatedConfig: InstantiatedConfig
  ) => { name: String; path: Path };
};

const processEnum = (e: EnumDetails, path: Path): GenericDeclaration => {
  const name = toCamelCase(e.name);
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
  };

  const declaration: GenericDeclaration = {
    declarationType: 'generic',
    comment: [`Zod schema for ${e.name}`],
    typeImports: [typeImport],
    lines,
  };

  return declaration;
};

const processRange = (
  r: RangeDetails,
  path: Path,
  typeMap: TypeMap
): GenericDeclaration | undefined => {
  const name = toCamelCase(r.name);

  let tsType = typeMap[r.innerType];
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
  };

  const declaration: GenericDeclaration = {
    declarationType: 'generic',
    comment: [`Zod schema for ${r.name}`],
    typeImports: [typeImport],
    lines,
  };

  return declaration;
};

const processDomain = (
  d: DomainDetails,
  path: Path,
  typeMap: TypeMap
): GenericDeclaration | undefined => {
  const name = toCamelCase(d.name);

  let tsType = typeMap[d.innerType];
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
  };

  const declaration: GenericDeclaration = {
    declarationType: 'generic',
    comment: [`Zod schema for ${d.name}`],
    typeImports: [typeImport],
    lines,
  };

  return declaration;
};
const processComposite = (
  c: CompositeDetails,
  path: Path,
  typeMap: TypeMap
): GenericDeclaration => {
  const name = toCamelCase(c.name);

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
    },
  ];

  const lines: string[] = [
    `export const ${name} = z.object({`,
    ...properties.map((p) => {
      const x = typeMap[p.type.fullName];
      let zodType: string;
      if (typeof x === 'string') {
        zodType = zodTypeMap[x];
        if (!zodType) {
          console.log(`Unknown type: ${x}`);
        }
      } else {
        console.log('=== =>', p.type.fullName, x);
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

const createOrAppendFileContents = (
  outputAcc: Output,
  path: Path,
  declaration: Declaration
): Output => ({
  ...outputAcc,
  [path]: {
    ...outputAcc[path],
    declarations: [...(outputAcc[path]?.declarations ?? []), declaration],
  },
});

const generateZodSchemas: PreRenderHook = async (
  outputAcc,
  instantiatedConfig
) => {
  let output = { ...outputAcc };

  for (const schemaName of Object.keys(instantiatedConfig.schemas)) {
    const schema = instantiatedConfig.schemas[schemaName];

    schema.enums.forEach((enumDetails) => {
      const { path } = instantiatedConfig.getMetadata(
        enumDetails,
        undefined,
        instantiatedConfig
      );
      const declaration = processEnum(enumDetails, path);
      output[path] = {
        declarations: [...output[path].declarations, declaration],
      };
    });

    schema.ranges.forEach((rangeDetails) => {
      const { path } = instantiatedConfig.getMetadata(
        rangeDetails,
        undefined,
        instantiatedConfig
      );
      const declaration = processRange(
        rangeDetails,
        path,
        instantiatedConfig.typeMap
      );
      output[path] = {
        declarations: [...output[path].declarations, declaration],
      };
    });

    schema.domains.forEach((domainDetails) => {
      const { path } = instantiatedConfig.getMetadata(
        domainDetails,
        undefined,
        instantiatedConfig
      );
      const declaration = processDomain(
        domainDetails,
        path,
        instantiatedConfig.typeMap
      );
      output[path] = {
        declarations: [...output[path].declarations, declaration],
      };
    });

    [
      ...schema.tables,
      ...schema.views,
      ...schema.materializedViews,
      ...schema.compositeTypes,
    ].forEach((compositeDetails) => {
      const { path } = instantiatedConfig.getMetadata(
        compositeDetails,
        undefined,
        instantiatedConfig
      );
      const declaration = processComposite(
        compositeDetails,
        path,
        instantiatedConfig.typeMap
      );
      output = createOrAppendFileContents(output, path, declaration);
    });
  }

  return output;
};

export default generateZodSchemas;
