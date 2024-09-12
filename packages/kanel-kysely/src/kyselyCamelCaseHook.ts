import { recase } from "@kristiandupont/recase";
import type { PreRenderHook } from "kanel";

const toCamelCase = recase(null, "camel");

export const kyselyCamelCaseHook: PreRenderHook = (output) =>
  Object.fromEntries(
    Object.entries(output).map(([path, fileContents]) => [
      path,
      {
        ...fileContents,
        declarations: fileContents.declarations.map((declaration) =>
          declaration.declarationType === "interface"
            ? {
                ...declaration,
                properties: declaration.properties.map((property) => ({
                  ...property,
                  name: toCamelCase(property.name),
                })),
              }
            : declaration,
        ),
      },
    ]),
  );
