import type { TsFileContents } from "./ts-utilities/renderTsFile";

export type Path = string;
export type GenericFileContents = {
  filetype: "generic";
  lines: string[];
};

export type FileContents = TsFileContents | GenericFileContents;

type Output = Record<Path, FileContents>;

export default Output;
