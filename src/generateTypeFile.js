/**
 * @param {import('extract-pg-schema').EnumType} type
 * @param {(typeName: string) => string} nominator
 * @returns {string[]}
 */
function generateTypeFile(type, nominator) {
  const lines = [];
  const { comment } = type;
  if (comment) {
    lines.push(`/** ${comment} */`);
  }
  lines.push(
    `type ${nominator(type.name)} = ${type.values
      .map((v) => `'${v}'`)
      .join(' | ')};`
  );
  lines.push(`export default ${nominator(type.name)};`);
  return lines;
}

export default generateTypeFile;
