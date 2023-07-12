import { TableColumn, TableDetails } from 'extract-pg-schema';

import { InstantiatedConfig } from './config-types';
import { TypeDeclaration } from './declaration-types';
import Details from './Details';
import {
  CompositeDetails,
  CompositeProperty,
} from './generators/composite-types';
import TypeDefinition from './TypeDefinition';

export type TypeMetadata = {
  name: string;
  comment: string[] | undefined;
  path: string;
};

export type GetMetadata = (
  details: Details,
  generateFor: 'selector' | 'initializer' | 'mutator' | undefined,
  instantiatedConfig: InstantiatedConfig,
) => TypeMetadata;

export type PropertyMetadata = {
  name: string;
  comment: string[] | undefined;
  typeOverride?: TypeDefinition;
  nullableOverride?: boolean;
  optionalOverride?: boolean;
};

export type GetPropertyMetadata = (
  property: CompositeProperty,
  details: CompositeDetails,
  generateFor: 'selector' | 'initializer' | 'mutator',
  instantiatedConfig: InstantiatedConfig,
) => PropertyMetadata;

export type GenerateIdentifierType = (
  column: TableColumn,
  details: TableDetails,
  instantiatedConfig: InstantiatedConfig,
) => TypeDeclaration;
