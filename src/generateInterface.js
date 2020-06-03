import { forEach, map, head, tail, flatten } from 'ramda';

const generateProperty = (
  considerDefaultValue,
  modelName,
  typeMap,
  pc,
) => ({
  name,
  type,
  nullable,
  isIdentifier,
  parent,
  defaultValue,
  indices,
  comment,
  tags,
}) => {
  const lines = [];

  let idType;

  const commentLines = comment ? [comment] : [];
  if (isIdentifier) {
    idType = `${pc(modelName)}Id`;
  } else if (parent) {
    idType = `${pc(parent.split('.')[0])}Id`;
  }
  if (defaultValue && considerDefaultValue) {
    commentLines.push(`Default value: ${defaultValue}`);
  }
  forEach((index) => {
    if (index.isPrimary) {
      commentLines.push(`Primary key. Index: ${index.name}`);
    } else {
      commentLines.push(`Index: ${index.name}`);
    }
  }, indices);

  if (commentLines.length === 1) {
    lines.push(`  /** ${commentLines[0]} */`);
  } else if (commentLines.length > 1) {
    lines.push('  /**');
    lines.push(...map((c) => `   * ${c}`, commentLines));
    lines.push('  */');
  }
  const optional = considerDefaultValue && (defaultValue || nullable);
  const varName = optional ? `${name}?` : name;

  const rawType = tags.type || idType || typeMap[type] || pc(type);
  const typeStr =
    nullable && !considerDefaultValue ? `${rawType} | null` : rawType;
  lines.push(`  ${varName}: ${typeStr};`);

  return lines;
};

const generateInterface = (
  {
    name,
    modelName = null,
    baseInterface = null,
    properties,
    considerDefaultValues,
    comment,
    exportAs,
  },
  typeMap,
  pc,
) => {
  const lines = [];
  if (comment) {
    lines.push('/**', ` * ${comment}`, ' */');
  }
  let exportStr = '';
  if (exportAs) {
    exportStr = exportAs === 'default' ? 'export default ' : 'export ';
  }
  const extendsStr = baseInterface ? ` extends ${baseInterface}` : '';
  lines.push(`${exportStr}interface ${pc(name)}${extendsStr} {`);
  const props = map(
    generateProperty(considerDefaultValues, modelName || name, typeMap, pc),
    properties
  );
  const propLines = flatten([
    head(props),
    // @ts-ignore
    ...map((p) => ['', ...p], tail(props)),
  ]);
  lines.push(...propLines);
  lines.push('}');
  return lines;
};

export default generateInterface;
