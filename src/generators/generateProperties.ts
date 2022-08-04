import { Schema, TableColumn, TableDetails } from 'extract-pg-schema';

import { TypeMap } from '../Config';
import {
  InterfacePropertyDeclaration,
  TypeDeclaration,
} from '../declaration-types';
import Details from '../Details';
import { PropertyMetadata, TypeMetadata } from '../metadata';
import TypeImport from '../TypeImport';
import { CompositeDetails, CompositeProperty } from './composite-types';
import resolveType from './resolveType';

type GeneratePropertiesConfig = {
  getPropertyMetadata: (
    property: CompositeProperty,
    details: CompositeDetails
  ) => PropertyMetadata;
  getMetadata: (details: Details) => TypeMetadata;
  generateIdentifierType:
    | ((c: TableColumn, d: TableDetails) => TypeDeclaration)
    | undefined;
  allowOptional: boolean;
  typeMap: TypeMap;
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
      const { name, comment, typeOverride, optionalOverride } =
        config.getPropertyMetadata(p, details);
      const isOptional = p.isNullable || p.defaultValue;

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

      return {
        name,
        comment,
        dimensions: p.isArray ? 1 : 0,
        isNullable: p.isNullable,
        isOptional:
          optionalOverride ?? config.allowOptional ? isOptional : false,
        typeName,
        typeImports,
      };
    }
  );
  return result;
};

export default generateProperties;
