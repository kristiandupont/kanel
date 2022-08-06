import { EnumDetails, Schema } from 'extract-pg-schema';

import {
  Declaration,
  GenericDeclaration,
  TypeDeclaration,
} from '../declaration-types';
import Details from '../Details';
import escapeName from '../escapeName';
import { TypeMetadata } from '../metadata';
import Output, { Path } from './Output';

type GenerateEnumsConfig = {
  getMetadata: (
    details: Details,
    generateFor: 'selector' | 'initializer' | 'mutator' | undefined
  ) => TypeMetadata;
  style: 'type' | 'enum';
};

const makeMapper =
  (config: GenerateEnumsConfig) =>
  (enumDetails: EnumDetails): { path: Path; declaration: Declaration } => {
    const { name, comment, path } = config.getMetadata(enumDetails, undefined);

    if (config.style === 'type') {
      const declaration: TypeDeclaration = {
        declarationType: 'typeDeclaration',
        name,
        comment,
        exportAs: 'default',
        typeDefinition: [
          '', // Start definition on new line
          ...enumDetails.values.map((value) => `   | '${value}'`),
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
  (config: GenerateEnumsConfig) =>
  (schema: Schema, outputAcc: Output): Output => {
    const declarations = schema.enums?.map(makeMapper(config)) ?? [];
    return declarations.reduce((acc, { path, declaration }) => {
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
