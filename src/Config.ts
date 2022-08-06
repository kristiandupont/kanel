import { PgType, TableColumn, TableDetails } from 'extract-pg-schema';
import { ConnectionConfig } from 'pg';

import { TypeDeclaration } from './declaration-types';
import Details from './Details';
import {
  CompositeDetails,
  CompositeProperty,
} from './generators/composite-types';
import { PropertyMetadata, TypeMetadata } from './metadata';
import TypeMap from './TypeMap';

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

  preDeleteModelFolder?: boolean;
  customTypeMap?: TypeMap;
  resolveViews?: boolean;
};

export default Config;
