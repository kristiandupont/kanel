import { Declaration } from '../declaration-types';

export type FileContents = {
  declarations: Declaration[];
};

export type Path = string;

type Output = {
  [path: Path]: FileContents;
};

export default Output;
