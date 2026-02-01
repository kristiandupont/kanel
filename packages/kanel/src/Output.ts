import type { TsDeclaration } from "./ts-utilities/ts-declaration-types";

export type Path = string;
export type TsFileContents = {
  fileType: "typescript";
  declarations: TsDeclaration[];
};

export type GenericContents = {
  fileType: "generic";
  lines: string[];
};

export type MarkdownContents = {
  fileType: "markdown";
  template: string;
  context: any;
};

export type FileContents = TsFileContents | GenericContents | MarkdownContents;

type Output = Record<Path, FileContents>;

export default Output;
