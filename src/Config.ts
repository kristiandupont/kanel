import { ConnectionConfig } from 'pg';

import Matcher from './Matcher';
import TypeImport from './TypeImport';

type BuiltinType = string;

export type TypeDefinition = BuiltinType | TypeImport;

export type TypeMap = Record<string, TypeDefinition>;

export type ModelAgentNoun = 'definition' | 'initializer' | 'mutator';

type Config = {
  connection?: string | ConnectionConfig;

  modelFolder?: string;
  ignore?: Matcher[];
  preDeleteModelFolder?: boolean;
  customTypeMap?: TypeMap;
};

export default Config;
