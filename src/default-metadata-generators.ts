import { recase } from '@kristiandupont/recase';
import { Schema, TableColumn, TableDetails } from 'extract-pg-schema';
import { tryParse } from 'tagged-comment-parser';

import { TypeDeclaration } from './declaration-types';
import Details from './Details';
import {
  CompositeDetails,
  CompositeProperty,
} from './generators/composite-types';
import resolveType from './generators/resolveType';
import { PropertyMetadata, TypeMetadata } from './metadata';
import TypeMap from './TypeMap';

const toPascalCase = recase('snake', 'pascal');

export const defaultGetMetadata = (details: Details): TypeMetadata => {
  const { comment: strippedComment } = tryParse(details.comment);
  const relationComment = `Represents the ${details.kind} ${details.schemaName}.${details.name}`;

  return {
    name: toPascalCase(details.name),
    comment: [relationComment, ...(strippedComment ? [strippedComment] : [])],
    path: `/models/${details.schemaName}/${toPascalCase(details.name)}`,
  };
};

export const defaultGetPropertyMetadata = (
  property: CompositeProperty,
  _details: CompositeDetails,
  generateFor: 'selector' | 'initializer' | 'mutator'
): PropertyMetadata => {
  const { comment: strippedComment } = tryParse(property.comment);

  return {
    name: property.name,
    comment: [
      ...(strippedComment ? [strippedComment] : []),
      ...(generateFor === 'initializer' && property.defaultValue
        ? [`Default value: ${property.defaultValue}`]
        : []),
    ],
  };
};

export const makeDefaultGenerateIdentifierType =
  (
    getMetadata: (details: Details) => TypeMetadata,
    schemas: Record<string, Schema>,
    typeMap: TypeMap
  ) =>
  (c: TableColumn, d: TableDetails): TypeDeclaration => {
    const name = toPascalCase(d.name) + toPascalCase(c.name);
    const innerType = resolveType(
      c,
      d,
      typeMap,
      schemas,
      getMetadata,
      undefined // Explicitly disable identifier generation so we get the inner type here
    );

    return {
      declarationType: 'typeDeclaration',
      name,
      exportAs: 'named',
      typeDefinition: [`${innerType} & { __brand: '${name}' }`],
      comment: [`Identifier type for ${d.schemaName}.${d.name}`],
    };
  };
