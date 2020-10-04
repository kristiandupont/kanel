import path from 'path';
import { map } from 'ramda';
import { recase } from '@kristiandupont/recase';
import generateFile from './generateFile';

/**
 * @param {import('extract-pg-schema').Type} type
 */
async function generateTypeFile(type, modelDir, casings) {
  const fc = recase(casings.sourceCasing, casings.filenameCasing);
  const tc = recase(casings.sourceCasing, casings.typeCasing);

  const lines = [];
  const { comment } = type;
  if (comment) {
    lines.push(`/** ${comment} */`);
  }
  lines.push(
    `type ${tc(type.name)} = ${map((v) => `'${v}'`, type.values).join(' | ')};`
  );
  lines.push(`export default ${tc(type.name)};`);
  const filename = `${fc(type.name)}.ts`;
  const fullPath = path.join(modelDir, filename);
  generateFile({ fullPath, lines });
}

export default generateTypeFile;
