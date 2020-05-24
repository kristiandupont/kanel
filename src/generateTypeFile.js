import path from 'path';
import { map } from 'ramda';
import generateFile from './generateFile';

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
    `type ${pc(type.name)} = ${map((v) => `'${v}'`, type.values).join(' | ')};`
  );
  lines.push(`export default ${pc(type.name)};`);
  const filename = `${fc(type.name)}.ts`;
  const fullPath = path.join(modelDir, filename);
  generateFile({ fullPath, lines });
}

export default generateTypeFile;
