export * from "./config-types";
export * from "./declaration-types";
export * from "./default-metadata-generators";
export { default as Details } from "./Details";
export { default as escapeComment } from "./escapeComment";
export { default as escapeFieldName } from "./escapeFieldName";
// For backwards compatibility
export { default as escapeName } from "./escapeFieldName";
export { default as escapeIdentifier } from "./escapeIdentifier";
export { default as escapeString } from "./escapeString";
export {
  CompositeDetails,
  CompositeProperty,
} from "./generators/composite-types";
export { default as resolveType } from "./generators/resolveType";
export * from "./hooks";
export * from "./metadata-types";
export { FileContents, default as Output, Path } from "./Output";
export { default as processDatabase } from "./processDatabase";
export { default as TypeDefinition } from "./TypeDefinition";
export { default as TypeImport } from "./TypeImport";
export { default as TypeMap } from "./TypeMap";
export { default as writeFile } from "./writeFile";
