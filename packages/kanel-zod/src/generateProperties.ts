import {
  CompositeDetails,
  CompositeProperty,
  InstantiatedConfig,
  resolveType,
  TypeImport,
} from 'kanel';
import * as R from 'ramda';

import { GenerateZodSchemasConfig } from './GenerateZodSchemasConfig';

export type ZodPropertyDeclaration = {
  name: string;
  value: string;
  typeImports: TypeImport[];
};

const generateProperties = <D extends CompositeDetails>(
  details: D,
  generateFor: 'selector' | 'initializer' | 'mutator',
  nonCompositeTypeImports: Record<string, TypeImport>,
  identifierTypeImports: Record<string, TypeImport>,
  config: GenerateZodSchemasConfig,
  instantiatedConfig: InstantiatedConfig,
): ZodPropertyDeclaration[] => {
  const ps =
    details.kind === 'compositeType' ? details.attributes : details.columns;

  const sortedPs = instantiatedConfig.propertySortFunction
    ? R.sort(instantiatedConfig.propertySortFunction, ps as any)
    : ps;

  const result: ZodPropertyDeclaration[] = sortedPs.map(
    (p: CompositeProperty): ZodPropertyDeclaration => {
      const { name, typeOverride, nullableOverride, optionalOverride } =
        instantiatedConfig.getPropertyMetadata(
          p,
          details,
          generateFor,
          instantiatedConfig,
        );
      const canBeOptional: boolean =
        p.isNullable || p.defaultValue || p.isIdentity;

      const t = typeOverride ?? resolveType(p, details, instantiatedConfig);

      let zodType: string;
      const typeImports: TypeImport[] = [];

      if (typeof t !== 'string' && t.name in identifierTypeImports) {
        const x = identifierTypeImports[t.name];
        typeImports.push(x);
        zodType = x.name;
      } else if (p.type.fullName in config.zodTypeMap) {
        const x = config.zodTypeMap[p.type.fullName];
        if (typeof x === 'string') {
          zodType = x;
          for (let i = p.dimensions || 0; i > 0; i--) {
            zodType = `${zodType}.array()`;
          }
        } else {
          zodType = x.name;
          typeImports.push(...x.typeImports);
        }
      } else if (p.type.fullName in nonCompositeTypeImports) {
        const x = nonCompositeTypeImports[p.type.fullName];
        typeImports.push(x);
        zodType = x.name;
      } else {
        console.error(
          `kanel-zod: Unknown type for ${name}.${p.name}: ${p.type.fullName}`,
        );
      }

      let isOptional: boolean;

      if (optionalOverride === undefined) {
        switch (generateFor) {
          case 'selector': {
            isOptional = false;
            break;
          }
          case 'initializer': {
            isOptional = canBeOptional;
            break;
          }
          case 'mutator': {
            isOptional = true;
            break;
          }
          default: {
            throw new Error(`Unexpected generateFor value: ${generateFor}`);
          }
        }
      } else {
        isOptional = optionalOverride;
      }

      const isNullable = Boolean(nullableOverride ?? p.isNullable);

      const qualifiers = [];
      if (isOptional) {
        qualifiers.push('optional()');
      }
      if (isNullable) {
        qualifiers.push('nullable()');
      }
      // if (comment) {
      //   qualifiers.push(`describe('${comment}')`);
      // }

      const value =
        qualifiers.length > 0 ? `${zodType}.${qualifiers.join('.')}` : zodType;

      return {
        name,
        value,
        typeImports,
      };
    },
  );
  return result;
};

export default generateProperties;
