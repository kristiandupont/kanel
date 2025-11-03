import type {
  CompositeTypeDetails,
  DomainDetails,
  EnumDetails,
  RangeDetails,
} from "extract-pg-schema";
import { tryParse } from "tagged-comment-parser";

import type { PreRenderHook } from "../config-types";
import type {
  CompositeDetails,
  CompositeProperty,
} from "../generators/composite-types";
import type TypeDefinition from "../ts-utilities/TypeDefinition";
import type { InterfaceDeclaration } from "../ts-utilities/ts-declaration-types";

/**
 * Extracts TypeDefinition from a @type tag in a comment
 */
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

/**
 * Pre-render hook that processes @type tags in database comments.
 *
 * This hook handles two types of @type tags:
 *
 * 1. Type-level tags (on domains, ranges, enums, composite types):
 *    - Removes the generated declaration for that type
 *    - Updates all references to that type to use the tagged type instead
 *
 * 2. Column-level tags (on table/view columns):
 *    - Updates the property type in the generated interface
 *
 * This is applied by default to maintain backward compatibility.
 */
const applyTaggedComments: PreRenderHook = (outputAcc, instantiatedConfig) => {
  const newOutput = { ...outputAcc };

  // Build a map of type full names to their tagged TypeDefinition
  const typeTagMap = new Map<string, TypeDefinition>();

  // Build a map of column identifiers to their tagged TypeDefinition
  const columnTagMap = new Map<string, TypeDefinition>();

  // Collect all entities that have @type tags
  const pathsToRemove = new Set<string>();

  Object.values(instantiatedConfig.schemas).forEach((schema) => {
    // Process domains
    schema.domains?.forEach((domain: DomainDetails) => {
      const typeFromComment = resolveTypeFromComment(domain.comment);
      if (typeFromComment) {
        const { name, path } = instantiatedConfig.getMetadata(
          domain,
          undefined,
          instantiatedConfig,
        );
        typeTagMap.set(name, typeFromComment);
        pathsToRemove.add(path);
      }
    });

    // Process ranges
    schema.ranges?.forEach((range: RangeDetails) => {
      const typeFromComment = resolveTypeFromComment(range.comment);
      if (typeFromComment) {
        const { name, path } = instantiatedConfig.getMetadata(
          range,
          undefined,
          instantiatedConfig,
        );
        typeTagMap.set(name, typeFromComment);
        pathsToRemove.add(path);
      }
    });

    // Process enums
    schema.enums?.forEach((enumDetails: EnumDetails) => {
      const typeFromComment = resolveTypeFromComment(enumDetails.comment);
      if (typeFromComment) {
        const { name, path } = instantiatedConfig.getMetadata(
          enumDetails,
          undefined,
          instantiatedConfig,
        );
        typeTagMap.set(name, typeFromComment);
        pathsToRemove.add(path);
      }
    });

    // Process composite types
    schema.compositeTypes?.forEach((compositeType: CompositeTypeDetails) => {
      const typeFromComment = resolveTypeFromComment(compositeType.comment);
      if (typeFromComment) {
        const { name, path } = instantiatedConfig.getMetadata(
          compositeType,
          undefined,
          instantiatedConfig,
        );
        typeTagMap.set(name, typeFromComment);
        pathsToRemove.add(path);
      }
    });

    // Process column-level tags for tables, views, materialized views, and composite types
    const processColumns = (
      details: CompositeDetails,
      columns: CompositeProperty[],
    ) => {
      columns.forEach((column) => {
        const typeFromComment = resolveTypeFromComment(column.comment);
        if (typeFromComment) {
          const columnKey = `${details.schemaName}.${details.name}.${column.name}`;
          columnTagMap.set(columnKey, typeFromComment);
        }
      });
    };

    schema.tables?.forEach((table) => processColumns(table, table.columns));
    schema.foreignTables?.forEach((table) =>
      processColumns(table, table.columns),
    );
    schema.views?.forEach((view) => processColumns(view, view.columns));
    schema.materializedViews?.forEach((view) =>
      processColumns(view, view.columns),
    );
    schema.compositeTypes?.forEach((composite) =>
      processColumns(composite, composite.attributes),
    );
  });

  // Remove files for types that have @type tags
  pathsToRemove.forEach((path) => {
    delete newOutput[path];
  });

  // Now process all remaining output to update type references
  Object.entries(newOutput).forEach(([path, fileContents]) => {
    if (fileContents.fileType !== "typescript") {
      return;
    }

    // Find the schema and entity name from the path to match columns
    let currentSchemaName: string | undefined;
    let currentEntityName: string | undefined;

    // Try to match the path to a schema entity to get context
    Object.values(instantiatedConfig.schemas).forEach((schema) => {
      const allEntities = [
        ...(schema.tables || []),
        ...(schema.foreignTables || []),
        ...(schema.views || []),
        ...(schema.materializedViews || []),
        ...(schema.compositeTypes || []),
      ];

      allEntities.forEach((entity) => {
        const { path: entityPath } = instantiatedConfig.getMetadata(
          entity,
          "selector",
          instantiatedConfig,
        );
        if (entityPath === path) {
          currentSchemaName = entity.schemaName;
          currentEntityName = entity.name;
        }
      });
    });

    fileContents.declarations.forEach((declaration) => {
      if (declaration.declarationType !== "interface") {
        return;
      }

      const interfaceDecl = declaration as InterfaceDeclaration;

      // Update each property in the interface
      interfaceDecl.properties.forEach((property) => {
        // First check for column-level @type tags
        if (currentSchemaName && currentEntityName) {
          const columnKey = `${currentSchemaName}.${currentEntityName}.${property.name}`;
          const columnTypeOverride = columnTagMap.get(columnKey);

          if (columnTypeOverride) {
            // Apply column-level type override
            if (typeof columnTypeOverride === "string") {
              property.typeName = columnTypeOverride;
              property.typeImports = [];
            } else {
              property.typeName = columnTypeOverride.name;
              property.typeImports = columnTypeOverride.typeImports;
            }
            return;
          }
        }

        // Check if this property's type is one that has a type-level @type tag
        // We need to check if the property's typeName matches any tagged type
        const matchingTaggedType = Array.from(typeTagMap.entries()).find(
          ([typeName, _]) =>
            // The property.typeName might be just the type name or include the schema prefix
            property.typeName === typeName ||
            property.typeName.endsWith(`_${typeName}`),
        );

        if (matchingTaggedType) {
          const [_, typeDefinition] = matchingTaggedType;

          // Remove old imports that referenced the now-deleted type file
          const importsToRemove = new Set<string>();
          pathsToRemove.forEach((removedPath) => {
            importsToRemove.add(removedPath);
          });

          if (property.typeImports) {
            property.typeImports = property.typeImports.filter(
              (imp) => !importsToRemove.has(imp.path),
            );
          }

          // Apply the new type
          if (typeof typeDefinition === "string") {
            property.typeName = typeDefinition;
            property.typeImports = [];
          } else {
            property.typeName = typeDefinition.name;
            property.typeImports = typeDefinition.typeImports;
          }
        }
      });
    });
  });

  return newOutput;
};

export default applyTaggedComments;
