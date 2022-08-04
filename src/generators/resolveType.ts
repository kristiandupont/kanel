import {
  ColumnReference,
  MaterializedViewColumn,
  MaterializedViewDetails,
  Schema,
  TableColumn,
  TableDetails,
  ViewColumn,
  ViewDetails,
} from 'extract-pg-schema';
import { tryParse } from 'tagged-comment-parser';

import { TypeMap } from '../Config';
import { TypeDeclaration } from '../declaration-types';
import Details from '../Details';
import { TypeMetadata } from '../metadata';
import TypeImport from '../TypeImport';
import { CompositeDetails, CompositeProperty } from './composite-types';

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
  c: CompositeProperty,
  d: CompositeDetails,
  typeMap: TypeMap,
  schemas: Record<string, Schema>,
  getMetadata: (details: Details) => TypeMetadata,
  generateIdentifierType:
    | ((c: TableColumn, d: TableDetails) => TypeDeclaration)
    | undefined
): string | TypeImport => {
  // 1) Check for a @type tag.
  const typeFromComment = resolveTypeFromComment(c.comment);
  if (typeFromComment) {
    return typeFromComment;
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
        getMetadata,
        generateIdentifierType
      );
    }
  }

  // 3) if the column is a primary key, use the generated type for it, if we do that
  if (generateIdentifierType && (c as TableColumn).isPrimaryKey) {
    const { path } = getMetadata(d);
    const { name, exportAs } = generateIdentifierType(
      c as TableColumn,
      d as TableDetails
    );

    return {
      name,
      absolutePath: path,
      isAbsolute: false,
      isDefault: exportAs === 'default',
    };
  }

  // 4) If there is a typemap type, use that
  if (c.type.fullName in typeMap) {
    return typeMap[c.type.fullName];
  }

  // 5) If the type is a composite, reference that.
  if (['composite', 'enum', 'domain', 'range'].includes(c.type.kind)) {
    const [schemaName, typeName] = c.type.fullName.split('.');
    let target: Details | undefined;
    if (c.type.kind === 'composite') {
      target = schemas[schemaName].compositeTypes.find(
        (t) => t.name === typeName
      );
    } else if (c.type.kind === 'enum') {
      target = schemas[schemaName].enums.find((t) => t.name === typeName);
    } else if (c.type.kind === 'domain') {
      target = schemas[schemaName].domains.find((t) => t.name === typeName);
    } else if (c.type.kind === 'range') {
      target = schemas[schemaName].ranges.find((t) => t.name === typeName);
    }

    if (target) {
      const typeFromComment = resolveTypeFromComment(target.comment);
      if (typeFromComment) {
        return typeFromComment;
      }

      const { name, path } = getMetadata(target);
      return {
        name,
        absolutePath: path,
        isAbsolute: false,
        isDefault: true,
      };
    }
  }

  // 6) If not found, set to unknown and print a warning.
  console.warn(`Could not resolve type for ${c.type.fullName}`);
  return 'unknown';
};

export default resolveType;
