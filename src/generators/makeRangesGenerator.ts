import { RangeDetails, Schema } from 'extract-pg-schema';
import { tryParse } from 'tagged-comment-parser';

import { Declaration, TypeDeclaration } from '../declaration-types';
import Details from '../Details';
import { TypeMetadata } from '../metadata';
import { TypeDefinition } from '../TypeDefinition';
import TypeImport from '../TypeImport';
import TypeMap from '../TypeMap';
import Output, { Path } from './Output';

type GenerateRangesConfig = {
  getMetadata: (
    details: Details,
    generateFor: 'selector' | 'initializer' | 'mutator' | undefined
  ) => TypeMetadata;
  typeMap: TypeMap;
};

const makeMapper =
  (config: GenerateRangesConfig) =>
  (
    rangeDetails: RangeDetails
  ): { path: Path; declaration: Declaration } | undefined => {
    // If a range has a @type tag in the comment,
    // we will use that type instead of a generated one.
    const { tags } = tryParse(rangeDetails.comment);
    if (tags?.type) {
      return undefined;
    }

    const { name, comment, path } = config.getMetadata(rangeDetails, undefined);

    let rType: string;
    const typeImports: TypeImport[] = [];

    const mapped: TypeDefinition = config.typeMap[rangeDetails.innerType];
    if (!mapped) {
      rType = 'unknown';
      console.warn(
        `Range '${name}' has unknown type '${rangeDetails.innerType}'`
      );
    } else if (typeof mapped === 'string') {
      rType = mapped;
    } else {
      rType = mapped.name;
      typeImports.push(mapped);
    }

    const declaration: TypeDeclaration = {
      declarationType: 'typeDeclaration',
      name,
      comment,
      exportAs: 'default',
      typeDefinition: [`[${rType}, ${rType}] as const`],
    };
    return { path, declaration };
  };

const makeRangesGenerator =
  (config: GenerateRangesConfig) =>
  (schema: Schema, outputAcc: Output): Output => {
    const declarations = schema.ranges?.map(makeMapper(config)) ?? [];
    return declarations.reduce((acc, elem) => {
      if (elem === undefined) return acc;
      const { path, declaration } = elem;
      const existing = acc[path];
      if (existing) {
        existing.declarations.push(declaration);
      } else {
        acc[path] = {
          declarations: [declaration],
        };
      }
      return acc;
    }, outputAcc);
  };

export default makeRangesGenerator;
