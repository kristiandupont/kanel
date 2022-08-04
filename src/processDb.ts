import { recase } from '@kristiandupont/recase';
import {
  extractSchemas,
  PgType,
  Schema,
  TableColumn,
  TableDetails,
} from 'extract-pg-schema';
import { ConnectionConfig } from 'pg';

import { TypeMap } from './Config';
import { TypeDeclaration } from './declaration-types';
import defaultTypeMap from './defaultTypeMap';
import Details from './Details';
import {
  CompositeDetails,
  CompositeProperty,
} from './generators/composite-types';
import makeCompositeGenerator from './generators/makeCompositeGenerator';
import makeDomainsGenerator from './generators/makeDomainsGenerator';
import makeEnumsGenerator from './generators/makeEnumsGenerator';
import makeRangesGenerator from './generators/makeRangesGenerator';
import Output from './generators/Output';
import resolveType from './generators/resolveType';
import { PropertyMetadata, TypeMetadata } from './metadata';
import render from './render';

type Config = {
  connection: string | ConnectionConfig;
  schemas?: string[];
  typeFilter?: (pgType: PgType) => boolean;
  getMetadata?: (details: Details) => TypeMetadata;
  getPropertyMetadata?: (
    property: CompositeProperty,
    details: CompositeDetails
  ) => PropertyMetadata;
  generateIdentifierType?: (c: TableColumn, d: TableDetails) => TypeDeclaration;

  preDeleteModelFolder?: boolean;
  customTypeMap?: TypeMap;
  resolveViews?: boolean;
};

const toPascalCase = recase('snake', 'pascal');

const defaultGetMetadata = (details: Details): TypeMetadata => ({
  name: toPascalCase(details.name),
  comment: details.comment ? [details.comment] : undefined,
  path: `/models/${details.schemaName}/${toPascalCase(details.name)}`,
});

const defaultGetPropertyMetadata = (
  property: CompositeProperty,
  _details: CompositeDetails
): PropertyMetadata => ({
  name: property.name,
  comment: property.comment ? [property.comment] : [],
});

const makeDefaultGenerateIdentifierType =
  (
    getMetadata: (details: Details) => TypeMetadata,
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
      comment: [`Identifier type for ${d.name}`],
    };
  };

const processDatabase = async (config: Config): Promise<void> => {
  const schemas = await extractSchemas(config.connection, {
    schemas: config.schemas,
    typeFilter: config.typeFilter,
  });

  const typeMap: TypeMap = {
    ...defaultTypeMap,
    ...config.customTypeMap,
  };

  const getMetadata = config.getMetadata ?? defaultGetMetadata;
  const getPropertyMetadata =
    config.getPropertyMetadata ?? defaultGetPropertyMetadata;
  const generateIdentifierType =
    config.generateIdentifierType ??
    makeDefaultGenerateIdentifierType(getMetadata, schemas, typeMap);

  const tableGenerator = makeCompositeGenerator('table', {
    getMetadata,
    getPropertyMetadata,
    generateIdentifierType,
    typeMap,
    schemas,
  });
  const viewGenerator = makeCompositeGenerator('view', {
    getMetadata,
    getPropertyMetadata,
    generateIdentifierType,
    typeMap,
    schemas,
  });
  const materializedViewGenerator = makeCompositeGenerator('materializedView', {
    getMetadata,
    getPropertyMetadata,
    generateIdentifierType,
    typeMap,
    schemas,
  });
  const enumGenerator = makeEnumsGenerator({
    getMetadata,
    style: 'enum',
  });
  const rangeGenerator = makeRangesGenerator({
    getMetadata,
    typeMap,
  });
  const domainGenerator = makeDomainsGenerator({
    getMetadata,
    typeMap,
  });
  const compositeTypeGenerator = makeCompositeGenerator('compositeType', {
    getMetadata,
    getPropertyMetadata,
    generateIdentifierType,
    typeMap,
    schemas,
  });

  let output: Output = {};
  Object.values(schemas).forEach((schema) => {
    output = tableGenerator(schema, output);
    output = viewGenerator(schema, output);
    output = materializedViewGenerator(schema, output);
    output = enumGenerator(schema, output);
    output = rangeGenerator(schema, output);
    output = domainGenerator(schema, output);
    output = compositeTypeGenerator(schema, output);
  });

  Object.keys(output).forEach((key) => {
    const file = render(output[key].declarations, `/models/${key}`);
    console.log('---', key, '---');
    console.log(file);
  });
};

export default processDatabase;
