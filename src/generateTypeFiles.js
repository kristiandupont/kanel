const R = require('ramda');
const { recase } = require('@kristiandupont/recase');
const generateTypeFile = require('./generateTypeFile');

/**
 * @param {Type[]} types
 */
async function generateTypeFiles(types, modelDir, fromCase, filenameCase) {
  const fc = recase(fromCase, filenameCase);
  const pc = recase(fromCase, 'pascal');
  R.forEach((t) => generateTypeFile(t, modelDir, fc, pc), types);
}

module.exports = generateTypeFiles;
