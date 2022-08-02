import { recase } from '@kristiandupont/recase';
import {
  CompositeTypeAttribute,
  extractSchemas,
  MaterializedViewColumn,
  PgType,
  TableColumn,
  ViewColumn,
} from 'extract-pg-schema';
import { ConnectionConfig } from 'pg';

import { TypeMap } from './Config';
import defaultTypeMap from './defaultTypeMap';
import Details from './Details';
import CompositeDetails from './generators/CompositeDetails';
import makeCompositeGenerator from './generators/makeCompositeGenerator';
import makeDomainsGenerator from './generators/makeDomainsGenerator';
import makeEnumsGenerator from './generators/makeEnumsGenerator';
import makeRangesGenerator from './generators/makeRangesGenerator';
import Output from './generators/Output';
import { PropertyMetadata, TypeMetadata } from './metadata';
import render from './render';

type Config = {
  connection: string | ConnectionConfig;
  schemas?: string[];
  typeFilter?: (pgType: PgType) => boolean;
  getMetadata?: (details: Details) => TypeMetadata;
  getPropertyMetadata: (
    property:
      | TableColumn
      | ViewColumn
      | MaterializedViewColumn
      | CompositeTypeAttribute,
    details: CompositeDetails
  ) => PropertyMetadata;
  preDeleteModelFolder?: boolean;
  customTypeMap?: Record<string, string>;
  resolveViews?: boolean;
};

const toPascalCase = recase('snake', 'pascal');
const defaultGetMetadata = (details: Details): TypeMetadata => ({
  name: toPascalCase(details.name),
  comment: details.comment ? [details.comment] : undefined,
  path: `/models/${toPascalCase(details.name)}`,
});

const defaultGetPropertyMetadata = (
  property:
    | TableColumn
    | ViewColumn
    | MaterializedViewColumn
    | CompositeTypeAttribute,
  _details: CompositeDetails
): PropertyMetadata => ({
  name: property.name,
  comment: property.comment ? [property.comment] : [],
});

const processDatabase = async (config: Config): Promise<void> => {
  const schemas = await extractSchemas(config.connection, {
    schemas: config.schemas,
    typeFilter: config.typeFilter,
  });

  const getMetadata = config.getMetadata ?? defaultGetMetadata;
  const getPropertyMetadata =
    config.getPropertyMetadata ?? defaultGetPropertyMetadata;

  const typeMap: TypeMap = {
    ...defaultTypeMap,
    ...config.customTypeMap,
  };

  const tableGenerator = makeCompositeGenerator('table', {
    getMetadata,
    getPropertyMetadata,
    style: 'interface',
    typeMap,
    schemas,
  });
  const viewGenerator = makeCompositeGenerator('view', {
    getMetadata,
    getPropertyMetadata,
    style: 'interface',
    typeMap,
    schemas,
  });
  const materializedViewGenerator = makeCompositeGenerator('materializedView', {
    getMetadata,
    getPropertyMetadata,
    style: 'interface',
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
    style: 'interface',
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
    const file = render(output[key].declarations, '/models');
    console.log('---', key, '---');
    console.log(file);
  });
};

export default processDatabase;
