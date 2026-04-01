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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  helpers?: Record<string, (...args: any[]) => any>;
};

export type FileContents = TsFileContents | GenericContents | MarkdownContents;

type Output = Record<Path, FileContents>;

export default Output;
