import { PgType, Schema } from 'extract-pg-schema';
import { ConnectionConfig } from 'pg';

import { CompositeProperty } from './generators/composite-types';
import {
  GenerateIdentifierType,
  GetMetadata,
  GetPropertyMetadata,
} from './metadata-types';
import Output from './Output';
import TypeMap from './TypeMap';

type Awaitable<T> = T | PromiseLike<T>;

export type InstantiatedConfig = {
  connection: string | ConnectionConfig;
  schemas: Record<string, Schema>;
  typeMap: TypeMap;

  getMetadata: GetMetadata;
  getPropertyMetadata: GetPropertyMetadata;
  generateIdentifierType: GenerateIdentifierType;
  propertySortFunction: (a: CompositeProperty, b: CompositeProperty) => number;

  enumStyle: 'enum' | 'type';

  outputPath: string;
  preDeleteOutputFolder: boolean;
  resolveViews: boolean;
};

export type PreRenderHook = (
  outputAcc: Output,
  instantiatedConfig: InstantiatedConfig
) => Awaitable<Output>;

export type PostRenderHook = (
  path: string,
  lines: string[],
  instantiatedConfig: InstantiatedConfig
) => Awaitable<string[]>;

// #region Config
export type Config = {
  connection: string | ConnectionConfig;
  schemas?: string[];
  typeFilter?: (pgType: PgType) => boolean;
  getMetadata?: GetMetadata;
  getPropertyMetadata?: GetPropertyMetadata;
  generateIdentifierType?: GenerateIdentifierType;
  propertySortFunction?: (a: CompositeProperty, b: CompositeProperty) => number;

  enumStyle?: 'enum' | 'type';

  outputPath?: string;
  preDeleteOutputFolder?: boolean;
  customTypeMap?: TypeMap;
  resolveViews?: boolean;

  preRenderHooks?: PreRenderHook[];
  postRenderHooks?: PostRenderHook[];
};
// #endregion Config
