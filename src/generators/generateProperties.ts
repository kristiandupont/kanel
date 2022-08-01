import {
  ColumnReference,
  CompositeTypeAttribute,
  CompositeTypeDetails,
  DomainDetails,
  EnumDetails,
  MaterializedViewColumn,
  MaterializedViewDetails,
  RangeDetails,
  Schema,
  TableColumn,
  TableDetails,
  ViewColumn,
  ViewDetails,
} from 'extract-pg-schema';
import { tryParse } from 'tagged-comment-parser';

import { TypeMap } from '../Config';
import {
  InterfacePropertyDeclaration,
  TypeDeclaration,
} from '../declaration-types';
import { PropertyMetadata } from '../metadata';
import TypeImport from '../TypeImport';
import CompositeDetails from './CompositeDetails';

type PropertyDetails =
  | TableColumn
  | ViewColumn
  | MaterializedViewColumn
  | CompositeTypeAttribute;

type GeneratePropertiesConfig = {
  getPropertyMetadata: (
    p: PropertyDetails,
    d: CompositeDetails
  ) => PropertyMetadata;
  allowOptional: boolean;
  typeMap: TypeMap;
};

const resolveTypeFromComment = (
  comment: string | undefined
): string | TypeImport | undefined => {
  const { tags } = tryParse(comment);
  if (tags?.type) {
    if (typeof tags.type === 'string') {
      // If it's just a string, assume system type. No import necessary
      return tags.type;
    } else if (Array.isArray(tags.type)) {
      const [name, absolutePath, isAbsoluteString, isDefaultString] = tags.type;
      return {
        name,
        absolutePath,
        isAbsolute: isAbsoluteString === 'true',
        isDefault: isDefaultString === 'true',
      };
    }
  }
};

const resolveType = (
  c: TableColumn | ViewColumn | MaterializedViewColumn | CompositeTypeAttribute,
  d: TableDetails | ViewDetails | MaterializedViewDetails | CompositeDetails,
  typeMap: TypeMap,
  schemas: Record<string, Schema>,
  generateIdentifierType?: (
    c: TableColumn,
    d: TableDetails
  ) => TypeImport & TypeDeclaration
): string | TypeImport => {
  let result: string | TypeImport | undefined;

  // 1) Check for a @type tag.
  result = resolveTypeFromComment(c.comment);
  if (result) {
    return result;
  }

  // 2) If there is a reference, resolve the type from the target
  if ((c as any).reference) {
    const reference: ColumnReference = (c as any).reference;
    let target: TableDetails | ViewDetails | MaterializedViewDetails = schemas[
      reference.schemaName
    ].tables.find((t) => t.name === reference.tableName);
    if (!target) {
      target = schemas[reference.schemaName].views.find(
        (v) => v.name === reference.tableName
      );
    }
    if (!target) {
      target = schemas[reference.schemaName].materializedViews.find(
        (v) => v.name === reference.tableName
      );
    }
    if (!target) {
      console.warn('Could not resolve reference', reference);
    }

    const column = (
      target.columns as Array<TableColumn | ViewColumn | MaterializedViewColumn>
    ).find((c) => c.name === reference.columnName);
    if (column) {
      return resolveType(
        column,
        target,
        typeMap,
        schemas,
        generateIdentifierType
      );
    }
  }

  // 3) if the column is a primary key, use the generated type for it, if we do that
  // if (generateIdentifierType && (c as TableColumn).isPrimaryKey) {
  //   const {} = generateIdentifierType(c as TableColumn, d as TableDetails);
  // }

  // 4) If there is a typemap type, use that
  if (c.type.fullName in typeMap) {
    return typeMap[c.type.fullName];
  }

  // 5) If the type is a composite, reference that.
  if (['composite', 'enum', 'domain', 'range'].includes(c.type.kind)) {
    const [schemaName, typeName] = c.type.fullName.split('.');
    let target:
      | CompositeTypeDetails
      | EnumDetails
      | DomainDetails
      | RangeDetails
      | undefined;
    if (c.type.kind === 'composite') {
      target = schemas[schemaName].compositeTypes.find(
        (t) => t.name === typeName
      );
    } else if (c.type.kind === 'enum') {
      target = schemas[schemaName].enums.find((t) => t.name === typeName);
    } else if (c.type.kind === 'domain') {
      target = schemas[schemaName].domains.find((t) => t.name === typeName);
    } else if (c.type.kind === 'range') {
      target = schemas[schemaName].domains.find((t) => t.name === typeName);
    }

    if (target) {
      result = resolveTypeFromComment(target.comment);
      if (result) {
        return result;
      }

      // return importType(target);
      return target.name;
    }
  }

  // 6) If not found, set to unknown and print a warning.
  return 'unknown';
};

const generateProperties = <D extends CompositeDetails>(
  config: GeneratePropertiesConfig,
  details: D,
  schemas: Record<string, Schema>
): InterfacePropertyDeclaration[] => {
  const ps =
    details.kind === 'compositeType' ? details.attributes : details.columns;

  const result: InterfacePropertyDeclaration[] = ps.map(
    (p: PropertyDetails): InterfacePropertyDeclaration => {
      const { name, comment, typeOverride, optionalOverride } =
        config.getPropertyMetadata(p, details);
      const isOptional = p.isNullable || p.defaultValue;

      const t =
        typeOverride ?? resolveType(p, undefined, config.typeMap, schemas);

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
