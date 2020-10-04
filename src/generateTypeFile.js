import { map } from 'ramda';
import { recase } from '@kristiandupont/recase';

/**
 * @param {import('extract-pg-schema').Type} type
 * @param {import('./Casing').Casings} casings
 * @returns {string[]}
 */
function generateTypeFile(type, casings) {
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
  return lines;
}

export default generateTypeFile;
