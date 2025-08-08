export type * from "./config-types";
export type * from "./ts-declaration-types";
export * from "./default-metadata-generators";
export type { default as Details } from "./Details";
export { default as escapeComment } from "./escapeComment";
export { default as escapeFieldName } from "./escapeFieldName";
// For backwards compatibility
export { default as escapeName } from "./escapeFieldName";
export { default as escapeIdentifier } from "./escapeIdentifier";
export { default as escapeString } from "./escapeString";
export type {
  CompositeDetails,
  CompositeProperty,
} from "./generators/composite-types";
export { default as resolveType } from "./generators/resolveType";
export * from "./hooks";
export type * from "./metadata-types";
export type { FileContents, default as Output, Path } from "./Output";
export { default as processDatabase } from "./processDatabase";
export type { default as TypeDefinition } from "./TypeDefinition";
export type { default as TypeImport } from "./TypeImport";
export type { default as TypeMap } from "./TypeMap";
export { default as writeFile } from "./writeFile";
