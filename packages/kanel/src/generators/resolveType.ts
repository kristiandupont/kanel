import {
  ColumnReference,
  MaterializedViewColumn,
  MaterializedViewDetails,
  TableColumn,
  TableDetails,
  ViewColumn,
  ViewDetails,
} from 'extract-pg-schema';
import { tryParse } from 'tagged-comment-parser';

import { InstantiatedConfig } from '../config-types';
import Details from '../Details';
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
      const [
        name,
        path,
        isAbsoluteString,
        isDefaultString,
        importAsTypeString,
      ] = tags.type;
      return {
        name,
        path,
        isAbsolute: isAbsoluteString === 'true',
        isDefault: isDefaultString === 'true',
        importAsType: importAsTypeString === 'true',
      };
    }
  }
};

const resolveType = (
  c: CompositeProperty,
  d: CompositeDetails,
  config: InstantiatedConfig
): string | TypeImport => {
  // 1) Check for a @type tag.
  const typeFromComment = resolveTypeFromComment(c.comment);
  if (typeFromComment) {
    return typeFromComment;
  }

  // 2) If there is a reference, resolve the type from the target
  if ((c as any).reference) {
    const reference: ColumnReference = (c as any).reference;
    let target: TableDetails | ViewDetails | MaterializedViewDetails =
      config.schemas[reference.schemaName].tables.find(
        (t) => t.name === reference.tableName
      );
    if (!target) {
      target = config.schemas[reference.schemaName].views.find(
        (v) => v.name === reference.tableName
      );
    }
    if (!target) {
      target = config.schemas[reference.schemaName].materializedViews.find(
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
      return resolveType(column, target, config);
    }
  }

  // 3) If this is a view with a source (i.e. the table that it's based on),
  // get the type from the source.
  if ((c as ViewColumn | MaterializedViewColumn).source) {
    const source = (c as ViewColumn | MaterializedViewColumn).source;
    let target: TableDetails | ViewDetails | MaterializedViewDetails =
      config.schemas[source.schema].tables.find((t) => t.name === source.table);
    if (!target) {
      target = config.schemas[source.schema].views.find(
        (v) => v.name === source.table
      );
    }
    if (!target) {
      target = config.schemas[source.schema].materializedViews.find(
        (v) => v.name === source.table
      );
    }
    if (!target) {
      console.warn('Could not resolve source', source);
      // return to prevent error: cannot read property of undefined (reading columns)
      return 'unknown';
    }

    const column = (
      target.columns as Array<TableColumn | ViewColumn | MaterializedViewColumn>
    ).find((c) => c.name === source.column);

    if (column) {
      return resolveType(column, target, config);
    }
  }

  // 4) if the column is a primary key, use the generated type for it, if we do that
  if (config.generateIdentifierType && (c as TableColumn).isPrimaryKey) {
    const { path } = config.getMetadata(d, 'selector', config);
    const { name, exportAs } = config.generateIdentifierType(
      c as TableColumn,
      d as TableDetails,
      config
    );

    return {
      name,
      path,
      isAbsolute: false,
      isDefault: exportAs === 'default',
      importAsType: true,
    };
  }

  // 5) If there is a typemap type, use that
  if (c.type.fullName in config.typeMap) {
    return config.typeMap[c.type.fullName];
  }

  // 6) If the type is a composite, enum, range or domain, reference that.
  if (['composite', 'enum', 'domain', 'range'].includes(c.type.kind)) {
    const [schemaName, typeName] = c.type.fullName.split('.');
    let target: Details | undefined;
    if (c.type.kind === 'composite') {
      target = config.schemas[schemaName].compositeTypes.find(
        (t) => t.name === typeName
      );
    } else if (c.type.kind === 'enum') {
      target = config.schemas[schemaName].enums.find(
        (t) => t.name === typeName
      );
    } else if (c.type.kind === 'domain') {
      target = config.schemas[schemaName].domains.find(
        (t) => t.name === typeName
      );
    } else if (c.type.kind === 'range') {
      target = config.schemas[schemaName].ranges.find(
        (t) => t.name === typeName
      );
    }

    if (target) {
      const typeFromComment = resolveTypeFromComment(target.comment);
      if (typeFromComment) {
        return typeFromComment;
      }

      const { name, path } = config.getMetadata(target, 'selector', config);
      return {
        name,
        path,
        isAbsolute: false,
        isDefault: true,
        importAsType: true,
      };
    }
  }

  // 7) If not found, set to unknown and print a warning.
  console.warn(
    `Could not resolve type ${c.type.fullName} referenced in ${d.schemaName}.${c.name}`
  );
  return 'unknown';
};

export default resolveType;
