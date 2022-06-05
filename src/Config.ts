import { Column, Type } from 'extract-pg-schema';
import { ConnectionConfig } from 'pg';

import Matcher from './Matcher';
import { Model, TableModel, ViewModel } from './Model';

type BuiltinType = string;
type ImportedType = {
  name: string;
  module: string;
  absoluteImport: boolean;
  defaultImport: boolean;
};

export type TypeDefinition = BuiltinType | ImportedType;

export type TypeMap = { [index: string]: TypeDefinition };

export type Hook<T> = (lines: string[], src?: T) => string[];

export type ModelAdjective =
  | 'definition'
  | 'initializer'
  | 'mutator'
  | 'selector';

// In order to keep a little bit of track with the naming pipeline,
// we tag names that have already been processed by a primary nominator
// (i.e. modelNominator or typeNominator), and make sure that those
// are the ones passed into the secondary nominators that create
// things like initializer and file names.
export type GivenName = string & { __brand?: 'given-name' };

// Pass-through for defaults.
export const nameIdentity = (name: string): GivenName => name as GivenName;

export type Nominators = {
  modelNominator?: (modelName: string) => GivenName;
  propertyNominator?: (propertyName: string, model: Model) => string;
  initializerNominator?: (givenName: GivenName, modelName: string) => string;
  idNominator?: (givenName: GivenName, modelName: string) => string;
  typeNominator?: (typeName: string) => GivenName;
  fileNominator?: (givenName: GivenName, originalName: string) => string;
};

type Settings = {
  modelFolder?: string;
  ignore?: Matcher[];
  preDeleteModelFolder?: boolean;
  customTypeMap?: TypeMap;

  makeIdType?: (innerType: string, modelName: string) => string;

  modelHooks?: Hook<Model>[];
  modelCommentGenerator?: (model: TableModel | ViewModel) => string[];
  propertyCommentGenerator?: (
    column: Column,
    model: TableModel | ViewModel,
    modelAdjective: ModelAdjective
  ) => string[];
  typeHooks?: Hook<Type>[];
  resolveViews?: boolean;
} & Nominators;

export type SchemaConfig = {
  name: string;
  externalTypesFolder?: string;
} & Settings;

type Config = {
  connection?: string | ConnectionConfig;
  schemas: SchemaConfig[];
} & Settings;

export default Config;
