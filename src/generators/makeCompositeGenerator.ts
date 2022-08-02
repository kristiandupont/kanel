import {
  CompositeTypeAttribute,
  Kind,
  MaterializedViewColumn,
  Schema,
  TableColumn,
  ViewColumn,
} from 'extract-pg-schema';

import { TypeMap } from '../Config';
import { Declaration, InterfaceDeclaration } from '../declaration-types';
import { PropertyMetadata, TypeMetadata } from '../metadata';
import CompositeDetails from './CompositeDetails';
import generateProperties from './generateProperties';
import Output, { Path } from './Output';

type GenerateCompositeConfig = {
  getMetadata: (details: CompositeDetails) => TypeMetadata;
  getPropertyMetadata: (
    property:
      | TableColumn
      | ViewColumn
      | MaterializedViewColumn
      | CompositeTypeAttribute,
    details: CompositeDetails
  ) => PropertyMetadata;
  style: 'interface' | 'type';
  typeMap: TypeMap;
  schemas: Record<string, Schema>;
};

const makeMapper =
  <D extends CompositeDetails>(config: GenerateCompositeConfig) =>
  (details: D): { path: Path; declaration: Declaration } => {
    const { name, comment, path } = config.getMetadata(details);

    const properties = generateProperties(
      {
        allowOptional: false,
        getPropertyMetadata: config.getPropertyMetadata,
        typeMap: config.typeMap,
        getMetadata: config.getMetadata,
      },
      details,
      config.schemas
    );

    const declaration: InterfaceDeclaration = {
      declarationType: 'interface',
      name,
      comment,
      exportAs: 'default',
      properties,
    };
    return { path, declaration };
  };

const makeCompositeGenerator =
  (kind: Kind, config: GenerateCompositeConfig) =>
  (schema: Schema, outputAcc: Output): Output => {
    const declarations: { path: string; declaration: Declaration }[] =
      schema[`${kind}s`]?.map(makeMapper(config) as any) ?? [];
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
