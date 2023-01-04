import * as R from 'ramda';

import { InstantiatedConfig } from '../config-types';
import { InterfacePropertyDeclaration } from '../declaration-types';
import TypeImport from '../TypeImport';
import { CompositeDetails, CompositeProperty } from './composite-types';
import resolveType from './resolveType';

const generateProperties = <D extends CompositeDetails>(
  details: D,
  generateFor: 'selector' | 'initializer' | 'mutator',
  config: InstantiatedConfig
): InterfacePropertyDeclaration[] => {
  const ps =
    details.kind === 'compositeType' ? details.attributes : details.columns;

  const sortedPs = config.propertySortFunction
    ? R.sort(config.propertySortFunction, ps as any)
    : ps;

  const result: InterfacePropertyDeclaration[] = sortedPs.map(
    (p: CompositeProperty): InterfacePropertyDeclaration => {
      const {
        name,
        comment,
        typeOverride,
        nullableOverride,
        optionalOverride,
      } = config.getPropertyMetadata(p, details, generateFor, config);
      const canBeOptional: boolean =
        p.isNullable || p.defaultValue || p.isIdentity;

      const t = typeOverride ?? resolveType(p, details, config);

      let typeName: string;
      let typeImports: TypeImport[] = [];

      if (typeof t === 'string') {
        typeName = t;
      } else {
        typeName = t.name;
        typeImports = [t];
      }

      let isOptional: boolean;

      if (optionalOverride !== undefined) {
        isOptional = optionalOverride;
      } else {
        if (generateFor === 'selector') {
          isOptional = false;
        } else if (generateFor === 'initializer') {
          isOptional = canBeOptional;
        } else if (generateFor === 'mutator') {
          isOptional = true;
        } else {
          throw new Error(`Unexpected generateFor value: ${generateFor}`);
        }
      }

      const isNullable = Boolean(nullableOverride ?? p.isNullable);

      return {
        name,
        comment,
        dimensions: p.isArray ? 1 : 0,
        isNullable,
        isOptional,
        typeName,
        typeImports,
      };
    }
  );
  return result;
};

export default generateProperties;
