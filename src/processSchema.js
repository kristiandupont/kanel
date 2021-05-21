import path from 'path';
import { pipe, pluck, reject } from 'ramda';
import generateCompositeTypeFile from './generateCompositeTypeFile';
import generateModelFile from './generateModelFile';
import generateTypeFile from './generateTypeFile';
import generateIndexFile from './generateIndexFile';
import getSupportedTypes from './getSupportedTypes';
import writeFile from './writeFile';
import { notDeepEqual } from 'assert';

/**
 * @typedef { import('./Model').TableModel } TableModel
 * @typedef { import('./Model').ViewModel } ViewModel
 */

const applyHooks = (chain, src, lines) => {
  const boundChain = chain.map((f) => (l) => f(l, src));
  // @ts-ignore
  return pipe(...boundChain)(lines);
};

/**
 * @param {import('./Config').SchemaConfig} schemaConfig
 * @param {import('extract-pg-schema').Schema} schema
 * @param {import('./Config').TypeMap} typeMap
 * @param {import('./Config').Nominators} nominators
 * @param {(import("./Config").Hook<import('./Model').Model>)[]} modelProcessChain
 * @param {(import("./Config").Hook<import("extract-pg-schema").Type>)[]} typeProcessChain
 * @param {{[schameName: string]: string}} schemaFolderMap
 */
const processSchema = async (
  schemaConfig,
  schema,
  typeMap,
  nominators,
  modelProcessChain,
  typeProcessChain,
  schemaFolderMap,
  makeIdType
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
    ...tables.map((t) => /** @type {TableModel} */ ({ ...t, type: 'table' })),
    ...views.map((t) => /** @type {ViewModel} */ ({ ...t, type: 'view' })),
  ];

  const rejectIgnored = reject((m) =>
    (schemaConfig.ignore || []).includes(m.name)
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
  const wetIndexFileLines = applyHooks(modelProcessChain, {}, indexFileLines);
  writeFile({
    fullPath: path.join(schemaConfig.modelFolder, 'index.ts'),
    lines: wetIndexFileLines,
  });
};

export default processSchema;
