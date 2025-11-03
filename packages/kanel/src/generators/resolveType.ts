import { AsyncLocalStorage } from "node:async_hooks";
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

import { useKanelContext } from "../context";
import type Details from "../Details";
import type TypeDefinition from "../ts-utilities/TypeDefinition";
import type { CompositeDetails, CompositeProperty } from "./composite-types";

// AsyncLocalStorage to track visited columns during type resolution
// This prevents infinite loops when resolving circular references
const visitedStorage = new AsyncLocalStorage<
  Map<CompositeProperty, TypeDefinition>
>();

/**
 * Gets the current visited map from AsyncLocalStorage.
 * This should always be called within a resolution context.
 */
const getVisited = (): Map<CompositeProperty, TypeDefinition> => {
  const store = visitedStorage.getStore();
  if (!store) {
    throw new Error(
      "getVisited() called outside of resolution context. This is a bug.",
    );
  }
  return store;
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
  originCompositeDetails: CompositeDetails,
): TypeDefinition | undefined => {
  const { instantiatedConfig } = useKanelContext();

  const references = (c as TableColumn | ViewColumn | MaterializedViewColumn)
    .references as ColumnReference[];
  const referencedTypes = references.map((reference) => {
    const { column, details } = getColumnFromReference(
      reference,
      instantiatedConfig.schemas,
    );
    if (!column) {
      console.warn("Could not resolve reference", reference);
      return "unknown";
    }
    return resolveTypeInternal(column, details, false, originCompositeDetails);
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
  if (
    instantiatedConfig.generateIdentifierType &&
    (c as TableColumn).isPrimaryKey
  ) {
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

const resolveTypeInternal = (
  c: CompositeProperty,
  d: CompositeDetails,
  retainInnerIdentifierType = false,
  originCompositeDetails: CompositeDetails = d,
): TypeDefinition => {
  const { instantiatedConfig } = useKanelContext();
  const visited = getVisited();

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
    // 1) if the column is a primary key and we're generating identifier types,
    // do that first (before following any references)
    if (
      instantiatedConfig.generateIdentifierType &&
      !retainInnerIdentifierType &&
      (c as TableColumn).isPrimaryKey
    ) {
      const { path } = instantiatedConfig.getMetadata(
        d,
        "selector",
        instantiatedConfig,
      );
      const { name, exportAs } = instantiatedConfig.generateIdentifierType(
        c as TableColumn,
        d as TableDetails,
        instantiatedConfig,
      );
      const sameSchema = originCompositeDetails.schemaName === d.schemaName;
      const asName = sameSchema ? undefined : `${d.schemaName}_${name}`;

      return {
        name: asName ?? name,
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

    // 2) If there are references, try to resolve the type from the targets
    if ("references" in c && c.references.length > 0) {
      const typeFromReferences = getTypeFromReferences(c, originCompositeDetails);
      if (typeFromReferences) {
        return typeFromReferences;
      }
    }
    // 3) If this is a view with a source (i.e. the table that it's based on),
    // get the type from the source.
    if ((c as ViewColumn | MaterializedViewColumn).source) {
      const source = (c as ViewColumn | MaterializedViewColumn).source;
      let target: TableDetails | ViewDetails | MaterializedViewDetails =
        instantiatedConfig.schemas[source.schema].tables.find(
          (t) => t.name === source.table,
        );

      if (!target) {
        target = instantiatedConfig.schemas[source.schema].views.find(
          (v) =>
            v.name === source.table &&
            v.name !== (d as ViewDetails).informationSchemaValue.table_name,
        );
      }
      if (!target) {
        target = instantiatedConfig.schemas[
          source.schema
        ].materializedViews.find((v) => v.name === source.table);
      }
      if (!target) {
        target = instantiatedConfig.schemas["public"]?.tables?.find(
          (t) => t.name === source.table,
        );
      }
      if (!target) {
        target = instantiatedConfig.schemas["public"]?.views?.find(
          (v) =>
            v.name === source.table &&
            v.name !== (d as ViewDetails).informationSchemaValue.table_name,
        );
      }
      if (!target) {
        target = instantiatedConfig.schemas["public"]?.materializedViews?.find(
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
        return resolveTypeInternal(
          column,
          target,
          retainInnerIdentifierType,
          originCompositeDetails,
        );
      }
    }

    // 4) If there is a typemap type, use that
    if (c.type.fullName in instantiatedConfig.typeMap) {
      return instantiatedConfig.typeMap[c.type.fullName];
    }

    // 5) If the type is a composite, enum, range or domain, reference that.
    if (["composite", "enum", "domain", "range"].includes(c.type.kind)) {
      const [schemaName, typeName] = c.type.fullName.split(".");
      let target: Details | undefined;
      switch (c.type.kind) {
        case "composite": {
          target =
            instantiatedConfig.schemas[schemaName].compositeTypes.find(
              (t) => t.name === typeName,
            ) ??
            instantiatedConfig.schemas[schemaName].views?.find(
              (t) => t.name === typeName,
            ) ??
            instantiatedConfig.schemas[schemaName].materializedViews?.find(
              (t) => t.name === typeName,
            ) ??
            instantiatedConfig.schemas[schemaName].tables?.find(
              (t) => t.name === typeName,
            ) ??
            instantiatedConfig.schemas["public"]?.views?.find(
              (t) => t.name === typeName,
            ) ??
            instantiatedConfig.schemas["public"]?.materializedViews?.find(
              (t) => t.name === typeName,
            ) ??
            instantiatedConfig.schemas["public"]?.tables?.find(
              (t) => t.name === typeName,
            );
          break;
        }
        case "enum": {
          target = instantiatedConfig.schemas[schemaName].enums.find(
            (t) => t.name === typeName,
          );

          break;
        }
        case "domain": {
          target = instantiatedConfig.schemas[schemaName].domains.find(
            (t) => t.name === typeName,
          );

          break;
        }
        case "range": {
          target = instantiatedConfig.schemas[schemaName].ranges.find(
            (t) => t.name === typeName,
          );

          break;
        }
        // No default
      }

      if (target) {
        const { name, path } = instantiatedConfig.getMetadata(
          target,
          "selector",
          instantiatedConfig,
        );
        const sameSchema =
          originCompositeDetails.schemaName === target.schemaName;
        const asName = sameSchema ? undefined : `${target.schemaName}_${name}`;
        return {
          name: asName ?? name,
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

    // 6) If not found, set to unknown and print a warning.
    console.warn(
      `Could not resolve type ${c.type.fullName} referenced in ${d.schemaName}.${c.name}`,
    );
    return "unknown";
  })();

  // Update the visited map with the resolved type.
  visited.set(c, type);

  return type;
};

/**
 * Resolves the TypeScript type for a column property.
 * This is the public entry point that initializes the visited map in AsyncLocalStorage.
 * All nested calls will share the same visited map to prevent infinite loops.
 */
const resolveType = (
  c: CompositeProperty,
  d: CompositeDetails,
  retainInnerIdentifierType = false,
  originCompositeDetails: CompositeDetails = d,
): TypeDefinition => {
  // Check if we're already in a resolution context.
  // This happens when generateIdentifierType() (or other hooks) call resolveType
  // during an ongoing resolution. We must reuse the existing context to maintain
  // circular reference tracking.
  const existingVisited = visitedStorage.getStore();

  if (existingVisited) {
    // We're nested - reuse the existing visited map
    return resolveTypeInternal(
      c,
      d,
      retainInnerIdentifierType,
      originCompositeDetails,
    );
  }

  // We're at the top level - initialize a new visited map for this resolution tree
  return visitedStorage.run(new Map(), () =>
    resolveTypeInternal(c, d, retainInnerIdentifierType, originCompositeDetails),
  );
};

export default resolveType;
