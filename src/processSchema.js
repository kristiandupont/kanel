import path from 'path';
import { pluck, reject } from 'ramda';
import { recase } from '@kristiandupont/recase';
import generateModelFile from './generateModelFile';
import generateTypeFile from './generateTypeFile';
import generateIndexFile from './generateIndexFile';
import writeFile from './writeFile';

/**
 * @param {import('./Config').SchemaConfig} schemaConfig
 * @param {import('extract-pg-schema').Schema} schema
 * @param {import('./Config').TypeMap} typeMap
 * @param {import('./Casing').Casings} casings
 */
const processSchema = async (schemaConfig, schema, typeMap, casings) => {
  const { tables, views, types } = schema;
  const fc = recase(casings.sourceCasing, casings.filenameCasing);

  const rejectIgnored = reject((m) =>
    (schemaConfig.ignore || []).includes(m.name)
  );
  const includedTables = rejectIgnored(tables);
  const includedViews = rejectIgnored(views).map((v) => ({
    ...v,
    isView: true,
  }));

  types.forEach((t) => {
    const typeFileLines = generateTypeFile(t, casings);
    const filename = `${fc(t.name)}.ts`;
    writeFile({
      fullPath: path.join(schemaConfig.modelFolder, filename),
      lines: typeFileLines,
    });
  });

  const userTypes = pluck('name', types);
  includedTables.forEach((t) => {
    const modelFileLines = generateModelFile(t, typeMap, userTypes, casings);
    const filename = `${fc(t.name)}.ts`;
    writeFile({
      fullPath: path.join(schemaConfig.modelFolder, filename),
      lines: modelFileLines,
    });
  });
  includedViews.forEach((v) => {
    const viewFileLines = generateModelFile(v, typeMap, userTypes, casings);
    const filename = `${fc(v.name)}.ts`;
    writeFile({
      fullPath: path.join(schemaConfig.modelFolder, filename),
      lines: viewFileLines,
    });
  });

  const indexFileLines = generateIndexFile(
    [...includedTables, ...includedViews],
    userTypes,
    casings
  );
  writeFile({
    fullPath: path.join(schemaConfig.modelFolder, 'index.ts'),
    lines: indexFileLines,
  });
};

export default processSchema;
