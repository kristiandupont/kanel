import { Type } from 'extract-pg-schema';
import { PgConnectionConfig } from 'knex';
import { Model } from './generateModelFile';

export type TypeMap = { [index: string]: string };

export type Hook<T> = (lines: string[], src?: T) => string[];

// In order to keep a little bit of track with the naming pipeline,
// we tag names that have already been processed by a primary nominator
// (i.e. modelNominator or typeNominator), and make sure that those
// are the ones passed into the secondary nominators that create
// things like initializer and file names.
type GivenName = string & { __brand: 'given-name' };

// Pass-through for defaults.
export const nameIdentity = (name: string): GivenName => name as GivenName;

export type Nominators = {
  modelNominator: (modelName: string) => GivenName;
  propertyNominator: (propertyName: string, model: Model) => string;
  initializerNominator: (givenName: GivenName, modelName: string) => string;
  idNominator: (givenName: GivenName, modelName: string) => string;
  typeNominator: (typeName: string) => GivenName;
  fileNominator: (givenName: GivenName, originalName: string) => string;
};

type Settings = {
  modelFolder?: string;
  ignore?: string[];
  preDeleteModelFolder?: Boolean;
  customTypeMap?: TypeMap;
  makeIdType?: (innerType: string, modelName: string) => string;

  modelHooks?: Hook<Model>[];
  typeHooks?: Hook<Type>[];
} & Nominators;

export type SchemaConfig = {
  name: string;
  ignore?: string[];
  modelFolder: string;
  externalTypesFolder?: string;
} & Settings;

type Config = {
  connection?: PgConnectionConfig;
  schemas: SchemaConfig[];
} & Settings;

export default Config;
