import path from 'path';
import { pipe, pluck, reject } from 'ramda';
import { recase } from '@kristiandupont/recase';
import generateModelFile from './generateModelFile';
import generateTypeFile from './generateTypeFile';
import generateIndexFile from './generateIndexFile';
import writeFile from './writeFile';

const applyHooks = (chain, src, lines) => {
  const boundChain = chain.map((f) => (l) => f(l, src));
  // @ts-ignore
  return pipe(...boundChain)(lines);
};

/**
 * @param {import('./Config').SchemaConfig} schemaConfig
 * @param {import('extract-pg-schema').Schema} schema
 * @param {import('./Config').TypeMap} typeMap
 * @param {import('./Casing').Casings} casings
 * @param {(import("./Config").Hook<import('./generateModelFile').Model>)[]} modelProcessChain
 * @param {(import("./Config").Hook<import("extract-pg-schema").Type>)[]} typeProcessChain
 */
const processSchema = async (
  schemaConfig,
  schema,
  typeMap,
  casings,
  modelProcessChain,
  typeProcessChain
) => {
  const { tables, views, types } = schema;
  const fc = recase(casings.sourceCasing, casings.filenameCasing);

  types.forEach((t) => {
    const typeFileLines = generateTypeFile(t, casings);
    const wetTypeFileLines = applyHooks(typeProcessChain, t, typeFileLines);
    const filename = `${fc(t.name)}.ts`;
    writeFile({
      fullPath: path.join(schemaConfig.modelFolder, filename),
      lines: wetTypeFileLines,
    });
  });

  const models = [
    ...tables.map((t) => ({ ...t, isView: false })),
    ...views.map((t) => ({ ...t, isView: true })),
  ];

  const rejectIgnored = reject((m) =>
    (schemaConfig.ignore || []).includes(m.name)
  );
  const includedModels = rejectIgnored(models);

  const userTypes = pluck('name', types);

  includedModels.forEach((m) => {
    const modelFileLines = generateModelFile(m, typeMap, userTypes, casings);
    const wetModelFileLines = applyHooks(modelProcessChain, m, modelFileLines);
    const filename = `${fc(m.name)}.ts`;
    writeFile({
      fullPath: path.join(schemaConfig.modelFolder, filename),
      lines: wetModelFileLines,
    });
  });

  const indexFileLines = generateIndexFile(includedModels, userTypes, casings);
  const wetIndexFileLines = applyHooks(modelProcessChain, {}, indexFileLines);
  writeFile({
    fullPath: path.join(schemaConfig.modelFolder, 'index.ts'),
    lines: wetIndexFileLines,
  });
};

export default processSchema;
