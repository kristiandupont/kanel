import { recase } from "@kristiandupont/recase";
import type { TableColumn } from "extract-pg-schema";
import { join } from "path";
import { tryParse } from "tagged-comment-parser";

import escapeIdentifier from "./ts-utilities/escapeIdentifier";
import type { CompositeProperty } from "./generators/composite-types";
import resolveType from "./generators/resolveType";
import type {
  GenerateIdentifierType,
  GetMetadata,
  GetPropertyMetadata,
  GetRoutineMetadata,
} from "./metadata-types";
import { useKanelContext } from "./context";

const toPascalCase = recase(null, "pascal");

// #region defaultGetMetadata
/**
 * @deprecated This is a V3 compatibility export. In V4, use the builtinMetadata parameter
 * passed to your custom getMetadata function instead of importing this.
 *
 * Migration example:
 * ```ts
 * // V3 (deprecated):
 * import { defaultGetMetadata } from 'kanel';
 * getMetadata: (details, generateFor, instantiatedConfig) => {
 *   const defaults = defaultGetMetadata(details, generateFor, instantiatedConfig);
 *   return { ...defaults, comment: ['Custom'] };
 * }
 *
 * // V4 (recommended):
 * getMetadata: (details, generateFor, builtinMetadata) => {
 *   return { ...builtinMetadata, comment: ['Custom'] };
 * }
 * ```
 */
export const defaultGetMetadata: GetMetadata = (details, generateFor) => {
  const { comment: strippedComment } = tryParse(details.comment);
  const isAgentNoun = ["initializer", "mutator"].includes(generateFor);

  const relationComment = isAgentNoun
    ? `Represents the ${generateFor} for the ${details.kind} ${details.schemaName}.${details.name}`
    : `Represents the ${details.kind} ${details.schemaName}.${details.name}`;

  const suffix = isAgentNoun ? `_${generateFor}` : "";

  const context = useKanelContext();
  const outputPath = context.config.outputPath || ".";

  return {
    name: toPascalCase(details.name + suffix),
    comment: [relationComment, ...(strippedComment ? [strippedComment] : [])],
    path: join(outputPath, details.schemaName, toPascalCase(details.name)),
  };
};
// #endregion defaultGetMetadata

// #region defaultGetPropertyMetadata
/**
 * @deprecated This is a V3 compatibility export. In V4, use the builtinMetadata parameter
 * passed to your custom getPropertyMetadata function instead of importing this.
 */
export const defaultGetPropertyMetadata: GetPropertyMetadata = (
  property,
  _details,
  generateFor,
  _instantiatedConfig,
) => {
  const { comment: strippedComment } = tryParse(property.comment);

  return {
    name: property.name,
    comment: [
      ...(strippedComment ? [strippedComment] : []),
      ...(generateFor === "initializer" && property.defaultValue
        ? [`Default value: ${property.defaultValue}`]
        : []),
    ],
  };
};
// #endregion defaultGetPropertyMetadata

// #region defaultGenerateIdentifierType
/**
 * @deprecated This is a V3 compatibility export. In V4, use the builtinType parameter
 * passed to your custom generateIdentifierType function instead of importing this.
 */
export const defaultGenerateIdentifierType: GenerateIdentifierType = (
  column,
  details,
  _config,
) => {
  const name = escapeIdentifier(
    toPascalCase(details.name) + toPascalCase(column.name),
  );
  const innerType = resolveType(column, details, true);
  const imports = [];

  let type = innerType;
  if (typeof innerType === "object") {
    // Handle non-primitives
    type = innerType.name;
    imports.push(...innerType.typeImports);
  }

  return {
    declarationType: "typeDeclaration",
    name,
    exportAs: "named",
    typeDefinition: [
      `${type} & { __brand: '${details.schemaName}.${details.name}' }`,
    ],
    typeImports: imports,
    comment: [`Identifier type for ${details.schemaName}.${details.name}`],
  };
};
// #endregion defaultGenerateIdentifierType

// #region defaultPropertySortFunction
/**
 * @deprecated This is a V3 compatibility export. In V4, this is an internal builtin.
 * If you need custom sorting, provide your own propertySortFunction in PgTsGeneratorConfig.
 */
export const defaultPropertySortFunction = (
  a: CompositeProperty,
  b: CompositeProperty,
): number => {
  if ((a as TableColumn).isPrimaryKey && !(b as TableColumn).isPrimaryKey) {
    return -1;
  } else if (
    !(a as TableColumn).isPrimaryKey &&
    (b as TableColumn).isPrimaryKey
  ) {
    return 1;
  } else {
    // return a.name.localeCompare(b.name);
    return a.ordinalPosition - b.ordinalPosition;
  }
};
// #endregion defaultPropertySortFunction

// #region defaultGetRoutineMetadata
/**
 * @deprecated This is a V3 compatibility export. In V4, use the builtinMetadata parameter
 * passed to your custom getRoutineMetadata function instead of importing this.
 */
export const defaultGetRoutineMetadata: GetRoutineMetadata = (details) => {
  const context = useKanelContext();
  const outputPath = context.config.outputPath || ".";

  return {
    parametersName: `${details.name}_params`,
    parameters: details.parameters.map(({ name }) => ({
      name,
      comment: [],
    })),

    returnTypeName: `${details.name}_return_type`,
    returnTypeComment: [`Return type for ${details.name}`],

    path: join(outputPath, details.schemaName, details.name),
  };
};
// #endregion defaultGetRoutineMetadata
