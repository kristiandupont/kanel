import { Type } from 'extract-pg-schema';
import { PgConnectionConfig } from 'knex';
import Casing from './Casing';
import { Model } from './generateModelFile';

export type TypeMap = { [index: string]: string };

export type Hook<T> = (lines: string[], src?: T) => string[];

type Settings = {
  ignore?: string[];
  modelFolder?: string;
  sourceCasing?: Casing;
  typeCasing?: Casing;
  propertyCasing?: Casing;
  filenameCasing?: Casing;
  preDeleteModelFolder?: Boolean;
  customTypeMap?: TypeMap;
  modelHooks?: Hook<Model>[];
  typeHooks?: Hook<Type>[];
};

export type SchemaConfig = {
  name: string;
  ignore?: string[];
  modelFolder: string;
} & Settings;

type Config = {
  connection?: PgConnectionConfig;
  schemas: SchemaConfig[];
} & Settings;

export default Config;
