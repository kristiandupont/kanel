import { recase } from "@kristiandupont/recase";
import type { PgTsPreRenderHook } from "kanel";

const toCamelCase = recase(null, "camel");

export const kyselyCamelCaseHook: PgTsPreRenderHook = (output, _context) =>
  Object.fromEntries(
    Object.entries(output).map(([path, fileContents]) => {
      if (fileContents.fileType === "typescript") {
        return [
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
        ];
      } else {
        return [path, fileContents];
      }
    }),
  );
