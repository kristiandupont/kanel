import { forEach, map, head, tail, flatten } from 'ramda';
import { recase } from '@kristiandupont/recase';

const generateProperty = (
  considerDefaultValue,
  modelName,
  typeMap,
  tc,
  pc
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
    idType = `${tc(modelName)}Id`;
  } else if (parent) {
    idType = `${tc(parent.split('.')[0])}Id`;
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
    lines.push('   */');
  }
  const optional = considerDefaultValue && (defaultValue || nullable);
  const varName = optional ? `${pc(name)}?` : pc(name);

  const rawType = tags.type || idType || typeMap[type] || tc(type);
  const typeStr =
    nullable && !considerDefaultValue ? `${rawType} | null` : rawType;
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
  casings
) => {
  const tc = recase(casings.sourceCasing, casings.typeCasing);
  const pc = recase(casings.sourceCasing, casings.propertyCasing);

  const lines = [];
  if (comment) {
    lines.push('/**', ` * ${comment}`, ' */');
  }
  let exportStr = '';
  if (exportAs) {
    exportStr = exportAs === 'default' ? 'export default ' : 'export ';
  }
  const extendsStr = baseInterface ? ` extends ${baseInterface}` : '';
  lines.push(`${exportStr}interface ${tc(name)}${extendsStr} {`);
  const props = map(
    generateProperty(considerDefaultValues, modelName || name, typeMap, tc, pc),
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
