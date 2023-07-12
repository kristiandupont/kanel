import { Kind, Schema } from 'extract-pg-schema';
import { tryParse } from 'tagged-comment-parser';

import { InstantiatedConfig } from '../config-types';
import { Declaration, InterfaceDeclaration } from '../declaration-types';
import Output, { Path } from '../Output';
import { CompositeDetails } from './composite-types';
import generateProperties from './generateProperties';

const makeMapper =
  <D extends CompositeDetails>(config: InstantiatedConfig) =>
  (details: D): { path: Path; declaration: Declaration }[] => {
    if (details.kind === 'compositeType') {
      // If a composite type has a @type tag in the comment,
      // we will use that type instead of a generated one.
      const { tags } = tryParse(details.comment);
      if (tags?.type) {
        return [];
      }
    }

    const declarations: Declaration[] = [];
    const {
      name: selectorName,
      comment: selectorComment,
      path,
    } = config.getMetadata(details, 'selector', config);

    if (details.kind === 'table' && config.generateIdentifierType) {
      const { columns } = details;
      const identifierColumns = columns.filter(
        (c) => c.isPrimaryKey && !c.reference,
      );

      identifierColumns.forEach((c) =>
        declarations.push(config.generateIdentifierType(c, details, config)),
      );
    }

    const selectorProperties = generateProperties(details, 'selector', config);

    const selectorDeclaration: InterfaceDeclaration = {
      declarationType: 'interface',
      name: selectorName,
      comment: selectorComment,
      exportAs: 'default',
      properties: selectorProperties,
    };
    declarations.push(selectorDeclaration);

    if (details.kind === 'table') {
      const { name: initializerName, comment: initializerComment } =
        config.getMetadata(details, 'initializer', config);
      const initializerProperties = generateProperties(
        details,
        'initializer',
        config,
      );

      const initializerDeclaration: InterfaceDeclaration = {
        declarationType: 'interface',
        name: initializerName,
        comment: initializerComment,
        exportAs: 'named',
        properties: initializerProperties,
      };
      declarations.push(initializerDeclaration);

      const { name: mutatorName, comment: mutatorComment } = config.getMetadata(
        details,
        'mutator',
        config,
      );
      const mutatorProperties = generateProperties(details, 'mutator', config);

      const mutatorDeclaration: InterfaceDeclaration = {
        declarationType: 'interface',
        name: mutatorName,
        comment: mutatorComment,
        exportAs: 'named',
        properties: mutatorProperties,
      };
      declarations.push(mutatorDeclaration);
    }

    return declarations.map((declaration) => ({ path, declaration }));
  };

// "Composite" in this case means tables, views, materialized views and composite types.
// I.e. anything that has "properties" and will be turned into an interface in Typescript.
const makeCompositeGenerator =
  (kind: Kind, config: InstantiatedConfig) =>
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
