import { Declaration } from './declaration-types';
import escapeName from './escapeName';
import ImportGenerator from './importGenerator';

const processComments = (
  comments: string[] | undefined,
  indentation: number
): string[] => {
  if (!comments) {
    return [];
  }

  const i = ' '.repeat(indentation);
  if (comments.length === 1) {
    return [`${i}/** ${comments[0]} */`];
  } else if (comments.length > 1) {
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
      const t = `type ${name} = ${typeDefinition};`;
      if (exportAs === 'default') {
        declarationLines.push(...[t, '', `export default ${name};`]);
      } else {
        declarationLines.push(`export ${t}`);
      }
      break;
    }
    case 'interface': {
      const { exportAs, name, base, properties, comment } = declaration;
      declarationLines.push(...(processComments(comment, 0) || []));
      declarationLines.push(
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
            property.isNullable ? ' | null' : ''
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
      declarationLines.push(...processComments(declaration.comment, 0));
      declarationLines.push(...declaration.lines);
      if (declaration.typeImports) {
        declaration.typeImports.forEach((typeImport) =>
          importGenerator.addImport(typeImport)
        );
      }
      break;
    }
    default: {
      throw new Error(
        `Unknown declaration type: ${(declaration as any).declarationType}`
      );
    }
  }
  return declarationLines;
};

const render = (declarations: Declaration[], srcFolder: string): string[] => {
  const importGenerator = new ImportGenerator(srcFolder);
  const lines: string[] = [];

  declarations.forEach((declaration, index) => {
    if (index > 0) {
      lines.push('');
    }

    const declarationLines = processDeclaration(declaration, importGenerator);
    lines.push(...declarationLines);
  });

  const importLines = importGenerator.generateLines();
  if (importLines.length) {
    importLines.push('');
  }

  return [...importLines, ...lines];
};

export default render;
