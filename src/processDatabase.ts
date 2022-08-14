import { extractSchemas, Schema } from 'extract-pg-schema';

import Config, { Hook } from './Config';
import {
  defaultGetPropertyMetadata,
  defaultPropertySortFunction,
  makeDefaultGenerateIdentifierType,
  makeDefaultGetMetadata,
} from './default-metadata-generators';
import defaultTypeMap from './defaultTypeMap';
import makeCompositeGenerator from './generators/makeCompositeGenerator';
import makeDomainsGenerator from './generators/makeDomainsGenerator';
import makeEnumsGenerator from './generators/makeEnumsGenerator';
import makeRangesGenerator from './generators/makeRangesGenerator';
import Output from './generators/Output';
import render from './render';
import TypeMap from './TypeMap';
import writeFile from './writeFile';

type Progress = {
  onProgressStart?: (total: number) => void;
  onProgress?: () => void;
  onProgressEnd?: () => void;
};

const markAsGenerated = (
  _schemas: Record<string, Schema>,
  outputAcc: Output,
  _config: Config
): Output => {
  return outputAcc;
};

const processDatabase = async (
  config: Config,
  progress?: Progress
): Promise<void> => {
  const schemas = await extractSchemas(config.connection, {
    schemas: config.schemas,
    typeFilter: config.typeFilter,
    ...progress,
  });

  const typeMap: TypeMap = {
    ...defaultTypeMap,
    ...config.customTypeMap,
  };

  const getMetadata =
    config.getMetadata ?? makeDefaultGetMetadata(config.outputPath);
  const getPropertyMetadata =
    config.getPropertyMetadata ?? defaultGetPropertyMetadata;
  const generateIdentifierType =
    config.generateIdentifierType ??
    makeDefaultGenerateIdentifierType(getMetadata, schemas, typeMap);
  const propertySortFunction =
    config.propertySortFunction ?? defaultPropertySortFunction;

  const compositeConfig = {
    getMetadata,
    getPropertyMetadata,
    generateIdentifierType,
    propertySortFunction,
    typeMap,
    schemas,
  };
  const tableGenerator = makeCompositeGenerator('table', compositeConfig);
  const viewGenerator = makeCompositeGenerator('view', compositeConfig);
  const materializedViewGenerator = makeCompositeGenerator(
    'materializedView',
    compositeConfig
  );
  const compositeTypeGenerator = makeCompositeGenerator(
    'compositeType',
    compositeConfig
  );
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

  const hooks: Hook[] = [markAsGenerated, ...(config.hooks ?? [])];
  hooks.forEach((hook) => (output = hook(schemas, output, config)));

  Object.keys(output).forEach((path) => {
    const lines = render(output[path].declarations, path);
    writeFile({ fullPath: `${path}.ts`, lines });
  });
};

export default processDatabase;
