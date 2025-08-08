import type { TsDeclaration } from "./ts-declaration-types";

export type Path = string;
export type TsFileContents = {
  filetype: "typescript";
  declarations: TsDeclaration[];
};

export type GenericFileContents = {
  filetype: "generic";
  lines: string[];
};

export type FileContents = TsFileContents | GenericFileContents;

type Output = Record<Path, FileContents>;

export default Output;
