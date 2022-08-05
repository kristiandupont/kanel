import { extractSchemas } from 'extract-pg-schema';

import Config from './Config';
import {
  defaultGetMetadata,
  defaultGetPropertyMetadata,
  makeDefaultGenerateIdentifierType,
} from './default-metadata-generators';
import defaultTypeMap from './defaultTypeMap';
import makeCompositeGenerator from './generators/makeCompositeGenerator';
import makeDomainsGenerator from './generators/makeDomainsGenerator';
import makeEnumsGenerator from './generators/makeEnumsGenerator';
import makeRangesGenerator from './generators/makeRangesGenerator';
import Output from './generators/Output';
import render from './render';
import TypeMap from './TypeMap';

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
