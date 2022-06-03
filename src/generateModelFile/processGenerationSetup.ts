import ImportGenerator from '../importGenerator';
import ModelFileGenerationSetup, {
  Declaration,
} from './ModelFileGenerationSetup';

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
      const { name, typeDefinition } = declaration;
      declarationLines.push(...processComments(declaration.comments, 0));
      declarationLines.push(`export type ${name} = ${typeDefinition};`);
      break;
    }
    case 'interface': {
      const { isDefaultExport, name, base, properties, comments } = declaration;
      declarationLines.push(...(processComments(comments, 0) || []));
      declarationLines.push(
        `export${isDefaultExport ? ' default' : ''} interface ${name}${
          base ? ` extends ${base}` : ''
        } {`
      );
      properties.forEach((property, index) => {
        if (index > 0) {
          declarationLines.push('');
        }
        declarationLines.push(...(processComments(property.comments, 2) || []));
        declarationLines.push(
          `  ${property.name}${property.isOptional ? '?' : ''}: ${
            property.typeName
          };`
        );
        if (property.typeImport) {
          importGenerator.addImport(
            property.typeImport.name,
            property.typeImport.isDefault,
            property.typeImport.absolutePath,
            property.typeImport.isAbsolute
          );
        }
      });
      declarationLines.push('}');
      break;
    }
    case 'zodSchema': {
      // Since there is at least one Zod schema, we need to import Zod.
      importGenerator.addImport('z', true, 'zod', true);

      const { name, overrideType, properties, comments } = declaration;
      declarationLines.push(...processComments(comments, 0));
      declarationLines.push(
        `export const ${name}${
          overrideType ? `: z.Schema<${overrideType}>` : ''
        } = z.object({`
      );
      properties.forEach((property) => {
        declarationLines.push(
          `  ${property.name}: ${
            property.isBuiltin
              ? `z.${property.typeName}(),`
              : `${property.typeName},`
          }`
        );
        if (property.typeImport) {
          importGenerator.addImport(
            property.typeImport.name,
            property.typeImport.isDefault,
            property.typeImport.absolutePath,
            property.typeImport.isAbsolute
          );
        }
      });
      declarationLines.push('});');
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

const processGenerationSetup = (
  generationSetup: ModelFileGenerationSetup,
  srcFolder: string
): string[] => {
  const importGenerator = new ImportGenerator(srcFolder);
  const lines: string[] = [];

  generationSetup.declarations.forEach((declaration, index) => {
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

export default processGenerationSetup;
