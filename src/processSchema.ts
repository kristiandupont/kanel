import { Schema, Type } from 'extract-pg-schema';
import path from 'path';
import { pipe, pluck, reject } from 'ramda';

import { Hook, Nominators, SchemaConfig, TypeMap } from './Config';
import generateCompositeTypeFile from './generateCompositeTypeFile';
import generateIndexFile from './generateIndexFile';
import generateModelFile from './generateModelFile';
import generateTypeFile from './generateTypeFile';
import getSupportedTypes from './getSupportedTypes';
import { isMatch } from './Matcher';
import { Model } from './Model';
import writeFile from './writeFile';

const applyHooks = <T>(chain: Hook<T>[], src: T, lines: string[]): string[] => {
  const boundChain = chain.map((f) => (l) => f(l, src));
  // @ts-ignore
  return pipe(...boundChain)(lines);
};

const processSchema = async (
  schemaConfig: SchemaConfig,
  schema: Schema,
  typeMap: TypeMap,
  nominators: Nominators,
  modelProcessChain: Hook<Model>[],
  typeProcessChain: Hook<Type>[],
  schemaFolderMap: { [schemaName: string]: string },
  makeIdType: (innerType: string, modelName: string) => string
) => {
  const { tables, views, types } = schema;

  const { compositeTypes, enumTypes } = getSupportedTypes(types);

  enumTypes.forEach((t) => {
    const typeFileLines = generateTypeFile(t, nominators.typeNominator);
    const wetTypeFileLines = applyHooks(typeProcessChain, t, typeFileLines);
    const givenName = nominators.typeNominator(t.name);
    const filename = `${nominators.fileNominator(givenName, t.name)}.ts`;
    writeFile({
      fullPath: path.join(schemaConfig.modelFolder, filename),
      lines: wetTypeFileLines,
    });
  });

  const models = [
    ...tables.map((t) => ({ ...t, type: 'table' } as const)),
    ...views.map((t) => ({ ...t, type: 'view' } as const)),
  ];

  const rejectIgnored = reject((m: { name: string }) =>
    (schemaConfig.ignore || []).some((matcher) => isMatch(m.name, matcher))
  );
  const includedModels = rejectIgnored(models);

  const userTypes = pluck('name', types);
  const tableOrViewTypes = pluck('name', includedModels);

  compositeTypes.forEach((m) => {
    const modelFileLines = generateCompositeTypeFile(m, {
      typeMap,
      userTypes,
      tableOrViewTypes,
      nominators,
      schemaName: schemaConfig.name,
      externalTypesFolder: schemaConfig.externalTypesFolder,
      schemaFolderMap,
    });
    const wetModelFileLines = applyHooks(modelProcessChain, m, modelFileLines);
    const filename = `${nominators.fileNominator(
      nominators.modelNominator(m.name),
      m.name
    )}.ts`;
    writeFile({
      fullPath: path.join(schemaConfig.modelFolder, filename),
      lines: wetModelFileLines,
    });
  });

  includedModels.forEach((m) => {
    const modelFileLines = generateModelFile(m, {
      typeMap,
      userTypes,
      nominators,
      schemaName: schemaConfig.name,
      externalTypesFolder: schemaConfig.externalTypesFolder,
      schemaFolderMap,
      makeIdType,
    });
    const wetModelFileLines = applyHooks(modelProcessChain, m, modelFileLines);
    const filename = `${nominators.fileNominator(
      nominators.modelNominator(m.name),
      m.name
    )}.ts`;
    writeFile({
      fullPath: path.join(schemaConfig.modelFolder, filename),
      lines: wetModelFileLines,
    });
  });

  const indexFileLines = generateIndexFile(
    includedModels,
    userTypes,
    nominators
  );
  const wetIndexFileLines = applyHooks(
    modelProcessChain,
    {} as Model,
    indexFileLines
  );
  writeFile({
    fullPath: path.join(schemaConfig.modelFolder, 'index.ts'),
    lines: wetIndexFileLines,
  });
};

export default processSchema;
