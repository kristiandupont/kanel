import type { Declaration } from "./declaration-types";

export type Path = string;

export type TypescriptFileContents = {
  filetype: "typescript";
  declarations: Declaration[];
};

export type GenericFileContents = {
  filetype: "generic";
  extension: string;
  content: string;
};

export type FileContents = TypescriptFileContents | GenericFileContents;

export type Output = Record<Path, FileContents>;

export default Output;
