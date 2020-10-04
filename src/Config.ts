import { PgConnectionConfig } from 'knex';
import Casing from './Casing';

export type TypeMap = { [index: string]: string };

type SchemaConfig = {
  name: string;
  ignore?: string[];
  modelFolder: string;
};

type Config = {
  connection?: PgConnectionConfig;
  sourceCasing?: Casing;
  typeCasing?: Casing;
  propertyCasing?: Casing;
  filenameCasing?: Casing;
  preDeleteModelFolder?: Boolean;
  customTypeMap?: TypeMap;
  schemas: SchemaConfig[];
};

export default Config;
