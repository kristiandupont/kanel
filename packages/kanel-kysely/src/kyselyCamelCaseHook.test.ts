import type { InstantiatedConfig } from "kanel";
import { assert, expect, it } from "vitest";

import { kyselyCamelCaseHook } from "./kyselyCamelCaseHook.js";

it("Should transform all properties to camelCase", async () => {
  const output = await kyselyCamelCaseHook(
    {
      foo: {
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
    undefined as InstantiatedConfig,
  );

  assert("properties" in output["foo"].declarations[0]);
  assert("properties" in output["foo"].declarations[1]);
  assert("properties" in output["bar"].declarations[0]);

  expect(
    [
      ...output["foo"].declarations[0].properties,
      ...output["foo"].declarations[1].properties,
      ...output["bar"].declarations[0].properties,
    ].map((x) => x.name),
  ).toEqual([
    "snakeCase",
    "sCREAMINGSNAKECASE",
    "kebabCase",
    "pascalCase",
    "sTuDlYcApS",
  ]);
});
