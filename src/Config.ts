import { PgConnectionConfig } from 'knex';
import Casing from './Casing';

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
  customTypeMap?: { [index: string]: string };
  schemas: SchemaConfig[];
};

export default Config;
