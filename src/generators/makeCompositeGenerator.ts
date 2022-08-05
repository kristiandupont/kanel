import { Kind, Schema, TableColumn, TableDetails } from 'extract-pg-schema';

import {
  Declaration,
  InterfaceDeclaration,
  TypeDeclaration,
} from '../declaration-types';
import { PropertyMetadata, TypeMetadata } from '../metadata';
import TypeMap from '../TypeMap';
import { CompositeDetails, CompositeProperty } from './composite-types';
import generateProperties from './generateProperties';
import Output, { Path } from './Output';

type GenerateCompositeConfig = {
  getMetadata: (details: CompositeDetails) => TypeMetadata;
  getPropertyMetadata: (
    property: CompositeProperty,
    details: CompositeDetails,
    generateFor: 'selector' | 'initializer' | 'mutator'
  ) => PropertyMetadata;
  generateIdentifierType?: (c: TableColumn, d: TableDetails) => TypeDeclaration;
  typeMap: TypeMap;
  schemas: Record<string, Schema>;
};

const makeMapper =
  <D extends CompositeDetails>(config: GenerateCompositeConfig) =>
  (details: D): { path: Path; declaration: Declaration }[] => {
    const declarations: Declaration[] = [];
    const { name, comment, path } = config.getMetadata(details);

    if (details.kind === 'table' && config.generateIdentifierType) {
      const { columns } = details;
      const identifierColumns = columns.filter(
        (c) => c.isPrimaryKey && !c.reference
      );

      identifierColumns.forEach((c) =>
        declarations.push(config.generateIdentifierType(c, details))
      );
    }

    const selectorProperties = generateProperties(
      {
        generateFor: 'selector',
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
    declarations.push(selectorDeclaration);

    if (details.kind === 'table') {
      const initializerProperties = generateProperties(
        {
          generateFor: 'initializer',
          getPropertyMetadata: config.getPropertyMetadata,
          typeMap: config.typeMap,
          getMetadata: config.getMetadata,
          generateIdentifierType: config.generateIdentifierType,
        },
        details,
        config.schemas
      );

      const initializerDeclaration: InterfaceDeclaration = {
        declarationType: 'interface',
        name: `${name}Initializer`,
        comment: [`Initializer for ${name}`],
        exportAs: 'named',
        properties: initializerProperties,
      };
      declarations.push(initializerDeclaration);

      const mutatorProperties = generateProperties(
        {
          generateFor: 'mutator',
          getPropertyMetadata: config.getPropertyMetadata,
          typeMap: config.typeMap,
          getMetadata: config.getMetadata,
          generateIdentifierType: config.generateIdentifierType,
        },
        details,
        config.schemas
      );

      const mutatorDeclaration: InterfaceDeclaration = {
        declarationType: 'interface',
        name: `${name}Mutator`,
        comment: [`Mutator for ${name}`],
        exportAs: 'named',
        properties: mutatorProperties,
      };
      declarations.push(mutatorDeclaration);
    }

    return declarations.map((declaration) => ({ path, declaration }));
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
