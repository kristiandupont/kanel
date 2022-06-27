import { Column, Type } from 'extract-pg-schema';
import { ConnectionConfig } from 'pg';

import Matcher from './Matcher';
import { Model } from './Model';

type BuiltinType = string;
type ImportedType = {
  name: string;
  module: string;
  absoluteImport: boolean;
  defaultImport: boolean;
};

export type TypeDefinition = BuiltinType | ImportedType;

export type TypeMap = Record<string, TypeDefinition>;

export type Hook<T> = (lines: string[], src?: T) => string[];

export type ModelDeclarationType = 'interface' | 'zod-schema';

export type ModelAgentNoun = 'definition' | 'initializer' | 'mutator';

export type TypeDefinitionType = Type['type'];

export type Nominators = {
  modelNominator?: (
    modelName: string,
    model: Model,
    modelDeclarationType: ModelDeclarationType,
    modelAgentNoun: ModelAgentNoun
  ) => string;
  propertyNominator?: (
    propertyName: string,
    column: Column,
    model: Model
  ) => string;
  idNominator?: (modelName: string) => string;
  typeDefinitionNominator?: (typeName: string) => string;
  fileNominator?: (modelName: string, model: Model) => string;
};

type Settings = {
  modelFolder?: string;
  ignore?: Matcher[];
  preDeleteModelFolder?: boolean;
  customTypeMap?: TypeMap;

  generateIdTypes?: boolean;
  generateZodSchemas?: boolean | ((model: Model) => boolean);

  makeIdType?: (innerType: string, modelName: string) => string;

  modelHooks?: Hook<Model>[];

  modelCommentGenerator?: (
    model: Model,
    modelAgentNoun: ModelAgentNoun
  ) => string[];

  propertyCommentGenerator?: (
    column: Column,
    model: Model,
    modelAgentNoun: ModelAgentNoun
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
