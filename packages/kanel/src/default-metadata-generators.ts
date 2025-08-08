import { recase } from "@kristiandupont/recase";
import type { TableColumn } from "extract-pg-schema";
import { join } from "path";

import escapeIdentifier from "./escapeIdentifier";
import type { CompositeProperty } from "./generators/composite-types";
import type {
  GenerateIdentifierType,
  GetMetadata,
  GetPropertyMetadata,
  GetRoutineMetadata,
} from "./metadata-types";

const toPascalCase = recase(null, "pascal");

// #region defaultGetMetadata
export const defaultGetMetadata: GetMetadata = (
  details,
  generateFor,
  defaultResult,
) => {
  const isAgentNoun = ["initializer", "mutator"].includes(generateFor);

  const relationComment = isAgentNoun
    ? `Represents the ${generateFor} for the ${details.kind} ${details.schemaName}.${details.name}`
    : `Represents the ${details.kind} ${details.schemaName}.${details.name}`;

  const suffix = isAgentNoun ? `_${generateFor}` : "";

  return {
    name: toPascalCase(details.name + suffix),
    comment: [relationComment, ...(defaultResult.comment || [])],
    path: join(
      defaultResult.path,
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
  defaultResult,
) => ({
  name: property.name,
  comment: [
    ...(defaultResult.comment || []),
    ...(generateFor === "initializer" && property.defaultValue
      ? [`Default value: ${property.defaultValue}`]
      : []),
  ],
});
// #endregion defaultGetPropertyMetadata

// #region defaultGenerateIdentifierType
export const defaultGenerateIdentifierType: GenerateIdentifierType = (
  column,
  details,
  defaultResult,
) => {
  const name = escapeIdentifier(
    toPascalCase(details.name) + toPascalCase(column.name),
  );

  return {
    ...defaultResult,
    name,
    typeDefinition: [
      `${defaultResult.typeDefinition[0]} & { __brand: '${details.schemaName}.${details.name}' }`,
    ],
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

// #region defaultGetRoutineMetadata
export const defaultGetRoutineMetadata: GetRoutineMetadata = (
  details,
  defaultResult,
) => ({
  ...defaultResult,
  parametersName: `${details.name}_params`,
  parameters: details.parameters.map(({ name }) => ({
    name,
    comment: [],
  })),

  returnTypeName: `${details.name}_return_type`,
  returnTypeComment: [`Return type for ${details.name}`],

  path: defaultResult.path,
});
// #endregion defaultGetRoutineMetadata
