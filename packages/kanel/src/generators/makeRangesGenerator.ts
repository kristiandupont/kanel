import { RangeDetails, Schema } from 'extract-pg-schema';
import { tryParse } from 'tagged-comment-parser';

import { InstantiatedConfig } from '../config-types';
import { Declaration, TypeDeclaration } from '../declaration-types';
import Output, { Path } from '../Output';
import TypeDefinition from '../TypeDefinition';
import TypeImport from '../TypeImport';

const makeMapper =
  (config: InstantiatedConfig) =>
  (
    rangeDetails: RangeDetails
  ): { path: Path; declaration: Declaration } | undefined => {
    // If a range has a @type tag in the comment,
    // we will use that type instead of a generated one.
    const { tags } = tryParse(rangeDetails.comment);
    if (tags?.type) {
      return undefined;
    }

    const { name, comment, path } = config.getMetadata(
      rangeDetails,
      undefined,
      config
    );

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
      typeImports.push(...mapped.typeImports);
    }

    const declaration: TypeDeclaration = {
      declarationType: 'typeDeclaration',
      name,
      comment,
      exportAs: 'default',
      typeDefinition: [`[lowerBound: ${rType}, upperBound: ${rType}]`],
    };
    return { path, declaration };
  };

const makeRangesGenerator =
  (config: InstantiatedConfig) =>
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
