import { PgType, Schema } from 'extract-pg-schema';
import { ConnectionConfig } from 'pg';

import { CompositeProperty } from './generators/composite-types';
import Output from './generators/Output';
import {
  GenerateIdentifierType,
  GetMetadata,
  GetPropertyMetadata,
} from './metadata-types';
import TypeMap from './TypeMap';

export type InstantiatedConfig = {
  schemas: Record<string, Schema>;
  typeMap: TypeMap;

  getMetadata: GetMetadata;
  getPropertyMetadata: GetPropertyMetadata;
  generateIdentifierType: GenerateIdentifierType;
  propertySortFunction: (a: CompositeProperty, b: CompositeProperty) => number;

  outputPath: string;
  preDeleteOutputFolder: boolean;
  resolveViews: boolean;
};

export type PreRenderHook = (
  outputAcc: Output,
  instantiatedConfig: InstantiatedConfig
) => Output;

export type PostRenderHook = (
  path: string,
  lines: string[],
  instantiatedConfig: InstantiatedConfig
) => string[];

// #region Config
export type Config = {
  connection: string | ConnectionConfig;
  schemas?: string[];
  typeFilter?: (pgType: PgType) => boolean;
  getMetadata?: GetMetadata;
  getPropertyMetadata?: GetPropertyMetadata;
  generateIdentifierType?: GenerateIdentifierType;
  propertySortFunction?: (a: CompositeProperty, b: CompositeProperty) => number;

  outputPath?: string;
  preDeleteOutputFolder?: boolean;
  customTypeMap?: TypeMap;
  resolveViews?: boolean;

  preRenderHooks?: PreRenderHook[];
  postRenderHooks?: PostRenderHook[];
};
// #endregion
