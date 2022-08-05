import { DomainDetails, Schema } from 'extract-pg-schema';

import { Declaration, TypeDeclaration } from '../declaration-types';
import Details from '../Details';
import { TypeMetadata } from '../metadata';
import { TypeDefinition } from '../TypeDefinition';
import TypeImport from '../TypeImport';
import TypeMap from '../TypeMap';
import Output, { Path } from './Output';

type GenerateDomainsConfig = {
  getMetadata: (details: Details) => TypeMetadata;
  typeMap: TypeMap;
};

const makeMapper =
  (config: GenerateDomainsConfig) =>
  (domainDetails: DomainDetails): { path: Path; declaration: Declaration } => {
    const { name, comment, path } = config.getMetadata(domainDetails);

    let typeDefinition: string[] = [];
    const typeImports: TypeImport[] = [];

    const mapped: TypeDefinition = config.typeMap[domainDetails.innerType];
    if (!mapped) {
      typeDefinition = ['unknown'];
      console.warn(
        `Domain '${name}' has unknown type '${domainDetails.innerType}'`
      );
    } else if (typeof mapped === 'string') {
      typeDefinition = [mapped];
    } else {
      typeDefinition = [mapped.name];
      typeImports.push(mapped);
    }

    const declaration: TypeDeclaration = {
      declarationType: 'typeDeclaration',
      name,
      comment,
      exportAs: 'default',
      typeDefinition,
      typeImports,
    };
    return { path, declaration };
  };

const makeDomainsGenerator =
  (config: GenerateDomainsConfig) =>
  (schema: Schema, outputAcc: Output): Output => {
    const declarations = schema.domains?.map(makeMapper(config)) ?? [];
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

export default makeDomainsGenerator;
