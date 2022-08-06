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

export const defaultGetMetadata = (
  details: Details,
  generateFor: 'selector' | 'initializer' | 'mutator' | undefined
): TypeMetadata => {
  const { comment: strippedComment } = tryParse(details.comment);
  const isAgentNoun = ['initializer', 'mutator'].includes(generateFor);

  const relationComment = isAgentNoun
    ? `Represents the ${generateFor} for the ${details.kind} ${details.schemaName}.${details.name}`
    : `Represents the ${details.kind} ${details.schemaName}.${details.name}`;

  const suffix = isAgentNoun ? `_${generateFor}` : '';

  return {
    name: toPascalCase(details.name + suffix),
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
    getMetadata: (
      details: Details,
      generateFor: 'selector' | 'initializer' | 'mutator' | undefined
    ) => TypeMetadata,
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

export const defaultPropertySortFunction = (
  a: CompositeProperty,
  b: CompositeProperty
): number => {
  if ((a as TableColumn).isPrimaryKey && !(b as TableColumn).isPrimaryKey) {
    return -1;
  } else if (
    !(a as TableColumn).isPrimaryKey &&
    (b as TableColumn).isPrimaryKey
  ) {
    return 1;
  } else {
    // return a.name.localeCompare(b.name);
    return a.ordinalPosition - b.ordinalPosition;
  }
};
