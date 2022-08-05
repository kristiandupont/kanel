import { Schema, TableColumn, TableDetails } from 'extract-pg-schema';

import {
  InterfacePropertyDeclaration,
  TypeDeclaration,
} from '../declaration-types';
import Details from '../Details';
import { PropertyMetadata, TypeMetadata } from '../metadata';
import TypeImport from '../TypeImport';
import TypeMap from '../TypeMap';
import { CompositeDetails, CompositeProperty } from './composite-types';
import resolveType from './resolveType';

type GeneratePropertiesConfig = {
  getPropertyMetadata: (
    property: CompositeProperty,
    details: CompositeDetails,
    generateFor: 'selector' | 'initializer' | 'mutator'
  ) => PropertyMetadata;
  getMetadata: (details: Details) => TypeMetadata;
  generateIdentifierType:
    | ((c: TableColumn, d: TableDetails) => TypeDeclaration)
    | undefined;
  typeMap: TypeMap;
  generateFor: 'selector' | 'initializer' | 'mutator';
};

const generateProperties = <D extends CompositeDetails>(
  config: GeneratePropertiesConfig,
  details: D,
  schemas: Record<string, Schema>
): InterfacePropertyDeclaration[] => {
  const ps =
    details.kind === 'compositeType' ? details.attributes : details.columns;

  const result: InterfacePropertyDeclaration[] = ps.map(
    (p: CompositeProperty): InterfacePropertyDeclaration => {
      const {
        name,
        comment,
        typeOverride,
        nullableOverride,
        optionalOverride,
      } = config.getPropertyMetadata(p, details, config.generateFor);
      const canBeOptional = p.isNullable || p.defaultValue;

      const t =
        typeOverride ??
        resolveType(
          p,
          details,
          config.typeMap,
          schemas,
          config.getMetadata,
          config.generateIdentifierType
        );

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
        if (config.generateFor === 'selector') {
          isOptional = false;
        } else if (config.generateFor === 'initializer') {
          isOptional = canBeOptional;
        } else if (config.generateFor === 'mutator') {
          isOptional = true;
        }
      }

      const isNullable = nullableOverride ?? p.isNullable;

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
