import { extractSchemas, PgType } from 'extract-pg-schema';
import { ConnectionConfig } from 'pg';

import { TypeMap } from './Config';
import defaultTypeMap from './defaultTypeMap';
import Details from './Details';
import makeCompositeGenerator from './generators/makeCompositeGenerator';
import makeDomainsGenerator from './generators/makeDomainsGenerator';
import makeEnumsGenerator from './generators/makeEnumsGenerator';
import makeRangesGenerator from './generators/makeRangesGenerator';
import Output from './generators/Output';
import { PropertyMetadata, TypeMetadata } from './metadata';

type Config = {
  connectionConfig: string | ConnectionConfig;
  schemas?: string[];
  typeFilter?: (pgType: PgType) => boolean;
  getMetadata?: (details: Details) => TypeMetadata;
  getPropertyMetadata?: () => PropertyMetadata;
  preDeleteModelFolder?: boolean;
  customTypeMap?: Record<string, string>;
  resolveViews?: boolean;
};

const processDatabase = async (config: Config): Promise<void> => {
  const schemas = await extractSchemas(config.connectionConfig, {
    schemas: config.schemas,
    typeFilter: config.typeFilter,
  });

  const typeMap: TypeMap = {
    ...defaultTypeMap,
    ...config.customTypeMap,
  };

  const tableGenerator = makeCompositeGenerator('table', {
    getMetadata: config.getMetadata,
    getPropertyMetadata: config.getPropertyMetadata,
    style: 'interface',
    typeMap,
    schemas,
  });
  const viewGenerator = makeCompositeGenerator('view', {
    getMetadata: config.getMetadata,
    getPropertyMetadata: config.getPropertyMetadata,
    style: 'interface',
    typeMap,
    schemas,
  });
  const materializedViewGenerator = makeCompositeGenerator('materializedView', {
    getMetadata: config.getMetadata,
    getPropertyMetadata: config.getPropertyMetadata,
    style: 'interface',
    typeMap,
    schemas,
  });
  const enumGenerator = makeEnumsGenerator({
    getMetadata: config.getMetadata,
    style: 'enum',
  });
  const rangeGenerator = makeRangesGenerator({
    getMetadata: config.getMetadata,
    typeMap,
  });
  const domainGenerator = makeDomainsGenerator({
    getMetadata: config.getMetadata,
    typeMap,
  });
  const compositeTypeGenerator = makeCompositeGenerator('compositeType', {
    getMetadata: config.getMetadata,
    getPropertyMetadata: config.getPropertyMetadata,
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

  console.log(output);
};

export default processDatabase;
