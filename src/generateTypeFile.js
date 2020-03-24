const path = require('path');
const R = require('ramda');
const generateFile = require('./generateFile');

/**
 * @param {Type} type
 */
async function generateTypeFile(type, modelDir, fc, pc) {
  const lines = [];
  const { comment } = type;
  if (comment) {
    lines.push(`/** ${comment} */`);
  }
  lines.push(
    `type ${pc(type.name)} = ${R.map((v) => `'${v}'`, type.values).join(
      ' | '
    )};`
  );
  lines.push(`export default ${pc(type.name)};`);
  const filename = `${fc(type.name)}.ts`;
  const fullPath = path.join(modelDir, filename);
  generateFile({ fullPath, lines });
}

module.exports = generateTypeFile;
