import { Kind, Schema, TableColumn, TableDetails } from 'extract-pg-schema';

import { TypeMap } from '../Config';
import {
  Declaration,
  InterfaceDeclaration,
  TypeDeclaration,
} from '../declaration-types';
import { PropertyMetadata, TypeMetadata } from '../metadata';
import { CompositeDetails, CompositeProperty } from './composite-types';
import generateProperties from './generateProperties';
import Output, { Path } from './Output';

type GenerateCompositeConfig = {
  getMetadata: (details: CompositeDetails) => TypeMetadata;
  getPropertyMetadata: (
    property: CompositeProperty,
    details: CompositeDetails
  ) => PropertyMetadata;
  generateIdentifierType?: (c: TableColumn, d: TableDetails) => TypeDeclaration;
  typeMap: TypeMap;
  schemas: Record<string, Schema>;
};

const makeMapper =
  <D extends CompositeDetails>(config: GenerateCompositeConfig) =>
  (details: D): { path: Path; declaration: Declaration }[] => {
    const { name, comment, path: selectorPath } = config.getMetadata(details);

    const selectorProperties = generateProperties(
      {
        allowOptional: false,
        getPropertyMetadata: config.getPropertyMetadata,
        typeMap: config.typeMap,
        getMetadata: config.getMetadata,
        generateIdentifierType: config.generateIdentifierType,
      },
      details,
      config.schemas
    );

    const selectorDeclaration: InterfaceDeclaration = {
      declarationType: 'interface',
      name,
      comment,
      exportAs: 'default',
      properties: selectorProperties,
    };

    let identifierDeclarations: { declaration: Declaration; path: string }[] =
      [];
    if (details.kind === 'table' && config.generateIdentifierType) {
      const { columns } = details;
      const identifierColumns = columns.filter(
        (c) => c.isPrimaryKey && !c.reference
      );

      identifierDeclarations = identifierColumns.map((c) => {
        const declaration = config.generateIdentifierType(c, details);

        return {
          declaration,
          path: selectorPath,
        };
      });
    }

    return [
      ...identifierDeclarations,
      { path: selectorPath, declaration: selectorDeclaration },
    ];
  };

const makeCompositeGenerator =
  (kind: Kind, config: GenerateCompositeConfig) =>
  (schema: Schema, outputAcc: Output): Output => {
    const mapper = makeMapper(config);
    const declarations: { path: string; declaration: Declaration }[] =
      (schema[`${kind}s`] as CompositeDetails[])?.map(mapper).flat() ?? [];
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

export default makeCompositeGenerator;
