import { EnumDetails, Schema } from 'extract-pg-schema';
import { tryParse } from 'tagged-comment-parser';

import { InstantiatedConfig } from '../config-types';
import {
  Declaration,
  GenericDeclaration,
  TypeDeclaration,
} from '../declaration-types';
import escapeName from '../escapeName';
import Output, { Path } from '../Output';

type EnumStyle = 'enum' | 'type';

const makeMapper =
  (style: EnumStyle, config: InstantiatedConfig) =>
  (
    enumDetails: EnumDetails
  ): { path: Path; declaration: Declaration } | undefined => {
    // If an enum has a @type tag in the comment,
    // we will use that type instead of a generated one.
    const { tags } = tryParse(enumDetails.comment);
    if (tags?.type) {
      return undefined;
    }

    const { name, comment, path } = config.getMetadata(
      enumDetails,
      undefined,
      config
    );

    if (style === 'type') {
      const declaration: TypeDeclaration = {
        declarationType: 'typeDeclaration',
        name,
        comment,
        exportAs: 'default',
        typeDefinition: [
          '', // Start definition on new line
          ...enumDetails.values.map((value) => `| '${value}'`),
        ],
      };
      return { path, declaration };
    } else {
      const declaration: GenericDeclaration = {
        declarationType: 'generic',
        comment,
        lines: [
          `enum ${name} {`,
          ...enumDetails.values.map(
            (value) => `  ${escapeName(value)} = '${value}',`
          ),
          '};',
          '',
          `export default ${name};`,
        ],
      };
      return { path, declaration };
    }
  };

const makeEnumsGenerator =
  (style: EnumStyle, config: InstantiatedConfig) =>
  (schema: Schema, outputAcc: Output): Output => {
    const declarations = schema.enums?.map(makeMapper(style, config)) ?? [];
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

export default makeEnumsGenerator;
