import type {
  ColumnReference,
  MaterializedViewColumn,
  MaterializedViewDetails,
  Schema,
  TableColumn,
  TableDetails,
  ViewColumn,
  ViewDetails,
} from "extract-pg-schema";
import { tryParse } from "tagged-comment-parser";

import type { InstantiatedConfig } from "../config-types";
import type Details from "../Details";
import type TypeDefinition from "../TypeDefinition";
import type { CompositeDetails, CompositeProperty } from "./composite-types";

const resolveTypeFromComment = (
  comment: string | undefined,
): TypeDefinition | undefined => {
  const { tags } = tryParse(comment);
  if (tags?.type) {
    if (typeof tags.type === "string") {
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
        typeImports: [
          {
            name,
            asName: undefined,
            path,
            isAbsolute: isAbsoluteString === "true",
            isDefault: isDefaultString === "true",
            importAsType: importAsTypeString === "true",
          },
        ],
      };
    }
  }
};

const getColumnFromReference = (
  reference: ColumnReference,
  schemas: Record<string, Schema>,
): {
  column?: TableColumn | ViewColumn | MaterializedViewColumn;
  details?: TableDetails | ViewDetails | MaterializedViewDetails;
} => {
  const schema = schemas[reference.schemaName];
  if (!schema) {
    return { column: undefined, details: undefined };
  }
  let target: TableDetails | ViewDetails | MaterializedViewDetails =
    schema.tables.find((t) => t.name === reference.tableName);
  if (!target) {
    target = schema.views.find((v) => v.name === reference.tableName);
  }
  if (!target) {
    target = schema.materializedViews.find(
      (v) => v.name === reference.tableName,
    );
  }
  if (!target) {
    return { column: undefined, details: undefined };
  }

  const column = (
    target.columns as Array<TableColumn | ViewColumn | MaterializedViewColumn>
  ).find((c) => c.name === reference.columnName);
  if (column) {
    return { column, details: target };
  }
};

const getTypeFromReferences = (
  c: CompositeProperty,
  config: InstantiatedConfig,
  visited = new Map<CompositeProperty, TypeDefinition>(),
): TypeDefinition | undefined => {
  const references = (c as TableColumn | ViewColumn | MaterializedViewColumn)
    .references as ColumnReference[];
  const referencedTypes = references.map((reference) => {
    const { column, details } = getColumnFromReference(
      reference,
      config.schemas,
    );
    if (!column) {
      console.warn("Could not resolve reference", reference);
      return "unknown";
    }
    return resolveType(column, details, config, visited);
  });

  const seenTypeNames = new Set<string>();
  let dedupedReferencedTypes = [];
  referencedTypes
    .filter((t) => t !== "unknown")
    .forEach((t) => {
      const name = typeof t === "string" ? t : t.name;
      if (!seenTypeNames.has(name)) {
        dedupedReferencedTypes.push(t);
        seenTypeNames.add(name);
      }
    });

  // Don't use the simple primitive type if we're generating identifier types
  if (config.generateIdentifierType && (c as TableColumn).isPrimaryKey) {
    dedupedReferencedTypes = dedupedReferencedTypes.filter(
      (t) => typeof t !== "string",
    );
  }

  if (dedupedReferencedTypes.length === 0) {
    return;
  } else if (dedupedReferencedTypes.length === 1) {
    return dedupedReferencedTypes[0];
  } else {
    return {
      name: dedupedReferencedTypes
        .map((t) => (typeof t === "string" ? t : t.name))
        .join(" | "),
      typeImports: dedupedReferencedTypes.flatMap((t) =>
        typeof t === "string" ? [] : t.typeImports,
      ),
    };
  }
};

const resolveType = (
  c: CompositeProperty,
  d: CompositeDetails,
  config: InstantiatedConfig,
  visited = new Map<CompositeProperty, TypeDefinition>(),
): TypeDefinition => {
  // Check to see if we have already tried to resolve this column before.
  // This is to prevent infinite loops when there are circular references.
  if (visited.has(c)) {
    return visited.get(c);
  }

  // Track that we have visited this column to prevent infinite loops.
  // Later, once we have resolved the type, this value will be overwritten with
  // the resolved type.
  visited.set(c, "unknown");

  const type = (() => {
    // 1) Check for a @type tag.
    const typeFromComment = resolveTypeFromComment(c.comment);
    if (typeFromComment) {
      return typeFromComment;
    }

    // 2) If there are references, try to resolve the type from the targets
    if ("references" in c && c.references.length > 0) {
      const typeFromReferences = getTypeFromReferences(c, config, visited);
      if (typeFromReferences) return typeFromReferences;
    }
    // 3) If this is a view with a source (i.e. the table that it's based on),
    // get the type from the source.
    if ((c as ViewColumn | MaterializedViewColumn).source) {
      const source = (c as ViewColumn | MaterializedViewColumn).source;
      let target: TableDetails | ViewDetails | MaterializedViewDetails =
        config.schemas[source.schema].tables.find(
          (t) => t.name === source.table,
        );

      if (!target) {
        target = config.schemas[source.schema].views.find(
          (v) =>
            v.name === source.table &&
            v.name !== (d as ViewDetails).informationSchemaValue.table_name,
        );
      }
      if (!target) {
        target = config.schemas[source.schema].materializedViews.find(
          (v) => v.name === source.table,
        );
      }
      if (!target) {
        target = config.schemas["public"]?.tables?.find(
          (t) => t.name === source.table,
        );
      }
      if (!target) {
        target = config.schemas["public"]?.views?.find(
          (v) =>
            v.name === source.table &&
            v.name !== (d as ViewDetails).informationSchemaValue.table_name,
        );
      }
      if (!target) {
        target = config.schemas["public"]?.materializedViews?.find(
          (v) => v.name === source.table,
        );
      }

      if (!target) {
        console.warn("Could not resolve source", source);
        // return to prevent error: cannot read property of undefined (reading columns)
        return "unknown";
      }

      const column = (
        target.columns as Array<
          TableColumn | ViewColumn | MaterializedViewColumn
        >
      ).find((c) => c.name === source.column);

      if (column) {
        return resolveType(column, target, config);
      }
    }

    // 4) if the column is a primary key, use the generated type for it, if we do that
    if (config.generateIdentifierType && (c as TableColumn).isPrimaryKey) {
      const { path } = config.getMetadata(d, "selector", config);
      const { name, exportAs } = config.generateIdentifierType(
        c as TableColumn,
        d as TableDetails,
        config,
      );
      const asName =
        d.schemaName === "public" ? undefined : `${d.schemaName}_${name}`;

      return {
        name,
        typeImports: [
          {
            name,
            asName,
            path,
            isAbsolute: false,
            isDefault: exportAs === "default",
            importAsType: true,
          },
        ],
      };
    }

    // 5) If there is a typemap type, use that
    if (c.type.fullName in config.typeMap) {
      return config.typeMap[c.type.fullName];
    }

    // 6) If the type is a composite, enum, range or domain, reference that.
    if (["composite", "enum", "domain", "range"].includes(c.type.kind)) {
      const [schemaName, typeName] = c.type.fullName.split(".");
      let target: Details | undefined;
      switch (c.type.kind) {
        case "composite": {
          target =
            config.schemas[schemaName].compositeTypes.find(
              (t) => t.name === typeName,
            ) ??
            config.schemas[schemaName].views?.find(
              (t) => t.name === typeName,
            ) ??
            config.schemas[schemaName].materializedViews?.find(
              (t) => t.name === typeName,
            ) ??
            config.schemas[schemaName].tables?.find(
              (t) => t.name === typeName,
            ) ??
            config.schemas["public"]?.views?.find((t) => t.name === typeName) ??
            config.schemas["public"]?.materializedViews?.find(
              (t) => t.name === typeName,
            ) ??
            config.schemas["public"]?.tables?.find((t) => t.name === typeName);
          break;
        }
        case "enum": {
          target = config.schemas[schemaName].enums.find(
            (t) => t.name === typeName,
          );

          break;
        }
        case "domain": {
          target = config.schemas[schemaName].domains.find(
            (t) => t.name === typeName,
          );

          break;
        }
        case "range": {
          target = config.schemas[schemaName].ranges.find(
            (t) => t.name === typeName,
          );

          break;
        }
        // No default
      }

      if (target) {
        const typeFromComment = resolveTypeFromComment(target.comment);
        if (typeFromComment) {
          return typeFromComment;
        }

        const { name, path } = config.getMetadata(target, "selector", config);
        const asName =
          target.schemaName === "public"
            ? undefined
            : `${target.schemaName}_${name}`;
        return {
          name,
          typeImports: [
            {
              name,
              asName,
              path,
              isAbsolute: false,
              isDefault: true,
              importAsType: true,
            },
          ],
        };
      }
    }

    // 7) If not found, set to unknown and print a warning.
    console.warn(
      `Could not resolve type ${c.type.fullName} referenced in ${d.schemaName}.${c.name}`,
    );
    return "unknown";
  })();

  // Update the visited map with the resolved type.
  visited.set(c, type);

  return type;
};

export default resolveType;
