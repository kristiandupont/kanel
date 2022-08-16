import { PgType, Schema, TableColumn, TableDetails } from 'extract-pg-schema';
import { ConnectionConfig } from 'pg';

import { TypeDeclaration } from './declaration-types';
import Details from './Details';
import {
  CompositeDetails,
  CompositeProperty,
} from './generators/composite-types';
import Output from './generators/Output';
import { PropertyMetadata, TypeMetadata } from './metadata';
import TypeMap from './TypeMap';

export type InstantiatedConfig = {
  schemas: Record<string, Schema>;
  typeMap: TypeMap;

  getMetadata: (
    details: Details,
    generateFor: 'selector' | 'initializer' | 'mutator' | undefined
  ) => TypeMetadata;
  getPropertyMetadata: (
    property: CompositeProperty,
    details: CompositeDetails,
    generateFor: 'selector' | 'initializer' | 'mutator'
  ) => PropertyMetadata;
  generateIdentifierType: (c: TableColumn, d: TableDetails) => TypeDeclaration;
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
type Config = {
  connection: string | ConnectionConfig;
  schemas?: string[];
  typeFilter?: (pgType: PgType) => boolean;
  getMetadata?: (
    details: Details,
    generateFor: 'selector' | 'initializer' | 'mutator' | undefined
  ) => TypeMetadata;
  getPropertyMetadata?: (
    property: CompositeProperty,
    details: CompositeDetails,
    generateFor: 'selector' | 'initializer' | 'mutator'
  ) => PropertyMetadata;
  generateIdentifierType?: (c: TableColumn, d: TableDetails) => TypeDeclaration;
  propertySortFunction?: (a: CompositeProperty, b: CompositeProperty) => number;

  outputPath?: string;
  preDeleteOutputFolder?: boolean;
  customTypeMap?: TypeMap;
  resolveViews?: boolean;

  preRenderHooks?: PreRenderHook[];
  postRenderHooks?: PostRenderHook[];
};
// #endregion

export default Config;
