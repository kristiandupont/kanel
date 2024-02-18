import type { Declaration } from "./declaration-types";
import escapeComment from "./escapeComment";
import escapeFieldName from "./escapeFieldName";
import escapeIdentifier from "./escapeIdentifier";
import ImportGenerator from "./ImportGenerator";

const processComments = (
  comments: string[] | undefined,
  indentation: number,
): string[] => {
  if (!comments || comments.length === 0) {
    return [];
  }

  const escapedComments = comments.map((comment) => escapeComment(comment));

  const i = " ".repeat(indentation);
  if (escapedComments.length === 1) {
    return [`${i}/** ${escapedComments[0]} */`];
  } else {
    const lines: string[] = [];
    lines.push(`${i}/**`);
    escapedComments.forEach((comment) => lines.push(`${i} * ${comment}`));
    lines.push(`${i} */`);
    return lines;
  }
};

const processDeclaration = (
  declaration: Declaration,
  importGenerator: ImportGenerator,
) => {
  const declarationLines: string[] = [];

  switch (declaration.declarationType) {
    case "typeDeclaration": {
      const { exportAs, name, typeDefinition, comment } = declaration;
      declarationLines.push(...processComments(comment, 0));
      if (exportAs === "default") {
        if (typeDefinition.length === 1) {
          declarationLines.push(
            `type ${escapeIdentifier(name)} = ${typeDefinition[0]};`,
          );
        } else {
          const [head, ...tail] = typeDefinition;
          const tailLines = tail.map((l, i) =>
            i === tail.length - 1 ? `  ${l};` : `  ${l}`,
          );
          declarationLines.push(
            `type ${escapeIdentifier(name)} = ${head}`,
            ...tailLines,
          );
        }
        declarationLines.push("", `export default ${escapeIdentifier(name)};`);
      } else {
        if (typeDefinition.length === 1) {
          declarationLines.push(
            `export type ${escapeIdentifier(name)} = ${typeDefinition[0]};`,
          );
        } else {
          const [head, ...tail] = typeDefinition;
          const tailLines = tail.map((l, i) =>
            i === tail.length - 1 ? `  ${l};` : `  ${l}`,
          );
          declarationLines.push(
            `export type ${escapeIdentifier(name)} = ${head}`,
            ...tailLines,
          );
        }
      }
      break;
    }
    case "interface": {
      const { exportAs, name, base, properties, comment } = declaration;
      declarationLines.push(
        ...(processComments(comment, 0) || []),
        `export${
          exportAs === "default" ? " default" : ""
        } interface ${escapeIdentifier(name)}${
          base ? ` extends ${base}` : ""
        } {`,
      );
      properties.forEach((property, index) => {
        if (index > 0) {
          declarationLines.push("");
        }
        declarationLines.push(
          ...(processComments(property.comment, 2) || []),
          `  ${escapeFieldName(property.name)}${
            property.isOptional ? "?" : ""
          }: ${property.typeName}${"[]".repeat(property.dimensions)}${
            property.isNullable ? " | null" : ""
          };`,
        );
        if (property.typeImports) {
          property.typeImports.forEach((typeImport) =>
            importGenerator.addImport(typeImport),
          );
        }
      });
      declarationLines.push("}");
      break;
    }
    case "enum": {
      const { exportAs, name, values, comment } = declaration;
      declarationLines.push(
        ...(processComments(comment, 0) || []),
        exportAs === "named"
          ? `export enum ${escapeIdentifier(name)} {`
          : `enum ${escapeIdentifier(name)} {`,
        ...values.map((value) => `  ${escapeFieldName(value)} = '${value}',`),
        "};",
      );
      if (exportAs === "default") {
        declarationLines.push("", `export default ${escapeIdentifier(name)};`);
      }
      break;
    }
    case "constant": {
      const { exportAs, name, type, value, comment } = declaration;
      const values = Array.isArray(value) ? value : [value];

      const valuesWithSemicolon = values.map((v, i) =>
        i === values.length - 1 ? `${v};` : v,
      );

      const [valueHead, ...valueTail] = valuesWithSemicolon;

      declarationLines.push(
        ...(processComments(comment, 0) || []),
        `export${
          exportAs === "default" ? " default" : ""
        } const ${escapeIdentifier(name)}${
          type ? `: ${type}` : ""
        } = ${valueHead}`,
        ...valueTail,
      );
      break;
    }
    case "generic": {
      declarationLines.push(
        ...processComments(declaration.comment, 0),
        ...declaration.lines,
      );
      break;
    }
    default: {
      throw new Error(
        `Unknown declaration type: ${(declaration as any).declarationType}`,
      );
    }
  }

  if (declaration.typeImports) {
    declaration.typeImports.forEach((typeImport) =>
      importGenerator.addImport(typeImport),
    );
  }

  return declarationLines;
};

const render = (declarations: Declaration[], outputPath: string): string[] => {
  const importGenerator = new ImportGenerator(outputPath);
  const lines: string[] = [];

  declarations.forEach((declaration, index) => {
    if (index > 0) {
      lines.push("");
    }

    const declarationLines = processDeclaration(declaration, importGenerator);
    lines.push(...declarationLines);
  });

  const importLines = importGenerator.generateLines();
  if (importLines.length > 0) {
    importLines.push("");
  }

  return [...importLines, ...lines];
};

export default render;
