import { recase } from "@kristiandupont/recase";
import type { TableColumn } from "extract-pg-schema";
import { join } from "path";
import { tryParse } from "tagged-comment-parser";

import escapeIdentifier from "./escapeIdentifier";
import escapeString from "./escapeString";
import type { CompositeProperty } from "./generators/composite-types";
import resolveType from "./generators/resolveType";
import type {
  GenerateIdentifierType,
  GetMetadata,
  GetPropertyMetadata,
} from "./metadata-types";

const toPascalCase = recase(null, "pascal");

// #region defaultGetMetadata
export const defaultGetMetadata: GetMetadata = (
  details,
  generateFor,
  instantiatedConfig,
) => {
  const { comment: strippedComment } = tryParse(details.comment);
  const isAgentNoun = ["initializer", "mutator"].includes(generateFor);

  const relationComment = isAgentNoun
    ? `Represents the ${generateFor} for the ${details.kind} ${details.schemaName}.${details.name}`
    : `Represents the ${details.kind} ${details.schemaName}.${details.name}`;

  const suffix = isAgentNoun ? `_${generateFor}` : "";

  return {
    name: toPascalCase(details.name + suffix),
    comment: [relationComment, ...(strippedComment ? [strippedComment] : [])],
    path: join(
      instantiatedConfig.outputPath,
      details.schemaName,
      toPascalCase(details.name),
    ),
  };
};
// #endregion defaultGetMetadata

// #region defaultGetPropertyMetadata
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
export const defaultGenerateIdentifierType: GenerateIdentifierType = (
  column,
  details,
  config,
) => {
  const name = escapeIdentifier(
    toPascalCase(details.name) + toPascalCase(column.name),
  );
  const innerType = resolveType(column, details, {
    ...config,
    // Explicitly disable identifier resolution so we get the actual inner type here
    generateIdentifierType: undefined,
  });
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
    typeDefinition: [`${type} & { __brand: '${escapeString(name)}' }`],
    typeImports: imports,
    comment: [`Identifier type for ${details.schemaName}.${details.name}`],
  };
};
// #endregion defaultGenerateIdentifierType

// #region defaultPropertySortFunction
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
