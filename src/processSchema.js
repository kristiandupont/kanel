import { pluck, reject } from 'ramda';
import generateModelFile from './generateModelFile';
import generateTypeFile from './generateTypeFile';
import generateIndexFile from './generateIndexFile';

/**
 * @param {{ name?: string; ignore: any; modelFolder: any; }} schema
 * @param {import('extract-pg-schema').Schema} extractedSchemaObject
 * @param {import('./Config').TypeMap} typeMap
 * @param {import('./Casing').Casings} casings
 */
const processSchema = async (
  schema,
  extractedSchemaObject,
  typeMap,
  casings
) => {
  const { tables, views, types } = extractedSchemaObject;

  const rejectIgnored = reject((m) => (schema.ignore || []).includes(m.name));
  const includedTables = rejectIgnored(tables);
  const includedViews = rejectIgnored(views).map((v) => ({
    ...v,
    isView: true,
  }));

  types.forEach((t) => generateTypeFile(t, schema.modelFolder, casings));

  const userTypes = pluck('name', types);
  includedTables.forEach((t) =>
    generateModelFile(t, typeMap, userTypes, schema.modelFolder, casings)
  );
  includedViews.forEach((v) =>
    generateModelFile(v, typeMap, userTypes, schema.modelFolder, casings)
  );

  generateIndexFile(
    [...includedTables, ...includedViews],
    userTypes,
    schema.modelFolder,
    casings
  );
};

export default processSchema;
