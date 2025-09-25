export type * from "./config-types";
export type * from "./ts-utilities/ts-declaration-types";
export * from "./default-metadata-generators";
export type { default as Details } from "./Details";
export { default as escapeComment } from "./ts-utilities/escapeComment";
export { default as escapeFieldName } from "./ts-utilities/escapeFieldName";
// For backwards compatibility
export { default as escapeName } from "./ts-utilities/escapeFieldName";
export { default as escapeIdentifier } from "./ts-utilities/escapeIdentifier";
export { default as escapeString } from "./ts-utilities/escapeString";
export type {
  CompositeDetails,
  CompositeProperty,
} from "./generators/composite-types";
export { default as resolveType } from "./generators/resolveType";
export * from "./hooks";
export type * from "./metadata-types";
export type { FileContents, default as Output, Path } from "./Output";
export { default as processDatabase } from "./processDatabase";
export type { default as TypeDefinition } from "./ts-utilities/TypeDefinition";
export type { default as TypeImport } from "./ts-utilities/TypeImport";
export type { default as TypeMap } from "./TypeMap";
export { default as writeFile } from "./writeFile";
