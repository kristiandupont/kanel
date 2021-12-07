import { EnumType } from 'extract-pg-schema';

function generateTypeFile(
  type: EnumType,
  nominator: (typeName: string) => string
): string[] {
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
