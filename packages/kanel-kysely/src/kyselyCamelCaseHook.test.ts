import { expect, it } from "vitest";

import { kyselyCamelCaseHook } from "./kyselyCamelCaseHook.js";

it("Should transform all properties to camelCase", async () => {
  const output = await kyselyCamelCaseHook(
    {
      foo: {
        fileType: "typescript",
        declarations: [
          {
            declarationType: "interface",
            name: "Member",
            exportAs: "default",
            properties: [
              {
                name: "snake_case",
                typeName: "string",
                dimensions: 0,
                isOptional: false,
                isNullable: false,
              },
            ],
          },
          {
            declarationType: "interface",
            name: "Member",
            exportAs: "default",
            properties: [
              {
                name: "SCREAMING_SNAKE_CASE",
                typeName: "string",
                dimensions: 0,
                isOptional: false,
                isNullable: false,
              },
            ],
          },
        ],
      },
      bar: {
        fileType: "typescript",
        declarations: [
          {
            declarationType: "interface",
            name: "Member",
            exportAs: "default",
            properties: [
              {
                name: "kebab-case",
                typeName: "string",
                dimensions: 0,
                isOptional: false,
                isNullable: false,
              },
              {
                name: "PascalCase",
                typeName: "string",
                dimensions: 0,
                isOptional: false,
                isNullable: false,
              },
              {
                name: "sTuDlYcApS",
                typeName: "string",
                dimensions: 0,
                isOptional: false,
                isNullable: false,
              },
            ],
          },
        ],
      },
    },
  );

  const foo = output.foo as any;
  const bar = output.bar as any;

  expect(foo.declarations[0].properties[0].name).toBe("snakeCase");
  expect(foo.declarations[1].properties[0].name).toBe("sCREAMINGSNAKECASE");
  expect(bar.declarations[0].properties[0].name).toBe("kebabCase");
  expect(bar.declarations[0].properties[1].name).toBe("pascalCase");
  expect(bar.declarations[0].properties[2].name).toBe("sTuDlYcApS");
});
