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

export type FileContents = TsFileContents | GenericContents;

type Output = Record<Path, FileContents>;

export default Output;
