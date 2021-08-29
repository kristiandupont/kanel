type Property = {
  name: string;
  optional: boolean;
  typeName: string;
  commentLines: string[];
};

const generateInterface = ({
  name,
  comment,
  properties,
  exportAsDefault,
}: {
  name: string;
  comment: string;
  properties: Property[];
  exportAsDefault: boolean;
}): string[] => {
  const lines: string[] = [];

  if (comment) {
    lines.push('/**', ` * ${comment}`, ' */');
  }
  const exportStr = exportAsDefault ? 'export default' : 'export';

  lines.push(`${exportStr} interface ${name} {`);
  properties.forEach((property, index) => {
    if (index > 0) {
      lines.push('');
    }

    if (property.commentLines.length === 1) {
      lines.push(`  /** ${property.commentLines[0]} */`);
    } else if (property.commentLines.length > 1) {
      lines.push('  /**');
      property.commentLines.forEach((commentLine) =>
        lines.push(`   * ${commentLine}`)
      );
      lines.push('   */');
    }
    lines.push(
      `  ${property.name}${property.optional ? '?' : ''}: ${property.typeName};`
    );
  });

  lines.push('}');
  return lines;
};

export default generateInterface;
