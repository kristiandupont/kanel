const R = require('ramda');
const { recase } = require('@kristiandupont/recase');
const generateModelFile = require('./generateModelFile');
const generateModelIndexFile = require('./generateModelIndexFile');

/**
 * @param {Table[]} tables
 */
async function generateModelFiles(
  tables,
  views,
  typeMap,
  userTypes,
  modelDir,
  fromCase,
  filenameCase
) {
  const pc = recase(fromCase, 'pascal');
  const cc = recase(fromCase, 'camel');
  const fc = recase(fromCase, filenameCase);
  R.forEach(
    (table) =>
      generateModelFile(table, false, typeMap, userTypes, modelDir, pc, cc, fc),
    tables
  );
  R.forEach(
    (view) =>
      generateModelFile(view, true, typeMap, userTypes, modelDir, pc, cc, fc),
    views
  );
  generateModelIndexFile(
    [...tables, ...views.map((v) => ({ ...v, isView: true }))],
    modelDir,
    pc,
    fc,
    cc
  );
}

module.exports = generateModelFiles;
