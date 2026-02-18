import { recase } from "@kristiandupont/recase";
import type { PreRenderHookV4 } from "kanel";

const toCamelCase = recase(null, "camel");

export const zodCamelCaseHook: PreRenderHookV4 = (output) => {
  const transformInterfaceDeclaration = (declaration) => ({
    ...declaration,
    properties: declaration.properties.map((property) => ({
      ...property,
      name: toCamelCase(property.name),
    })),
  });

  const transformValue = (value: string | string[]) =>
    Array.isArray(value) && value.includes("z.object({")
      ? value.map(toCamelCase)
      : value;

  const transformDeclarations = (declarations) =>
    declarations.map((declaration) => {
      if (declaration.declarationType === "interface") {
        return transformInterfaceDeclaration(declaration);
      }

      if (declaration.value) {
        return {
          ...declaration,
          value: transformValue(declaration.value),
        };
      }

      return declaration;
    });

  const outputWithCamelCase = Object.fromEntries(
    Object.entries(output).map(([path, fileContents]) => {
      if (fileContents.fileType !== "typescript") {
        return [path, fileContents];
      }
      return [
        path,
        {
          fileType: "typescript" as const,
          declarations: transformDeclarations(fileContents.declarations),
        },
      ];
    }),
  );

  return outputWithCamelCase;
};
