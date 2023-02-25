import { Declaration } from './declaration-types';
import escapeName from './escapeName';
import ImportGenerator from './ImportGenerator';

const processComments = (
  comments: string[] | undefined,
  indentation: number
): string[] => {
  if (!comments || comments.length === 0) {
    return [];
  }

  const i = ' '.repeat(indentation);
  if (comments.length === 1) {
    return [`${i}/** ${comments[0]} */`];
  } else {
    const lines: string[] = [];
    lines.push(`${i}/**`);
    comments.forEach((comment) => lines.push(`${i} * ${comment}`));
    lines.push(`${i} */`);
    return lines;
  }
};

const processDeclaration = (
  declaration: Declaration,
  importGenerator: ImportGenerator
) => {
  const declarationLines: string[] = [];

  switch (declaration.declarationType) {
    case 'typeDeclaration': {
      const { exportAs, name, typeDefinition } = declaration;
      declarationLines.push(...processComments(declaration.comment, 0));
      if (exportAs === 'default') {
        if (typeDefinition.length === 1) {
          declarationLines.push(`type ${name} = ${typeDefinition[0]};`);
        } else {
          const [head, ...tail] = typeDefinition;
          const tailLines = tail.map((l, i) =>
            i === tail.length - 1 ? `  ${l};` : `  ${l}`
          );
          declarationLines.push(`type ${name} = ${head}`, ...tailLines);
        }
        declarationLines.push('', `export default ${name};`);
      } else {
        if (typeDefinition.length === 1) {
          declarationLines.push(`export type ${name} = ${typeDefinition[0]};`);
        } else {
          const [head, ...tail] = typeDefinition;
          const tailLines = tail.map((l, i) =>
            i === tail.length - 1 ? `  ${l};` : `  ${l}`
          );
          declarationLines.push(`export type ${name} = ${head}`, ...tailLines);
        }
      }
      break;
    }
    case 'interface': {
      const { exportAs, name, base, properties, comment } = declaration;
      declarationLines.push(
        ...(processComments(comment, 0) || []),
        `export${exportAs === 'default' ? ' default' : ''} interface ${name}${
          base ? ` extends ${base}` : ''
        } {`
      );
      properties.forEach((property, index) => {
        if (index > 0) {
          declarationLines.push('');
        }
        declarationLines.push(...(processComments(property.comment, 2) || []));
        declarationLines.push(
          `  ${escapeName(property.name)}${property.isOptional ? '?' : ''}: ${
            property.typeName
          }${'[]'.repeat(property.dimensions)}${
            property.isNullable ? ' | null' : ''
          };`
        );
        if (property.typeImports) {
          property.typeImports.forEach((typeImport) =>
            importGenerator.addImport(typeImport)
          );
        }
      });
      declarationLines.push('}');
      break;
    }
    case 'generic': {
      declarationLines.push(
        ...processComments(declaration.comment, 0),
        ...declaration.lines
      );
      break;
    }
    default: {
      throw new Error(
        `Unknown declaration type: ${(declaration as any).declarationType}`
      );
    }
  }

  if (declaration.typeImports) {
    declaration.typeImports.forEach((typeImport) =>
      importGenerator.addImport(typeImport)
    );
  }

  return declarationLines;
};

const render = (declarations: Declaration[], outputPath: string): string[] => {
  const importGenerator = new ImportGenerator(outputPath);
  const lines: string[] = [];

  declarations.forEach((declaration, index) => {
    if (index > 0) {
      lines.push('');
    }

    const declarationLines = processDeclaration(declaration, importGenerator);
    lines.push(...declarationLines);
  });

  const importLines = importGenerator.generateLines();
  if (importLines.length > 0) {
    importLines.push('');
  }

  return [...importLines, ...lines];
};

export default render;
