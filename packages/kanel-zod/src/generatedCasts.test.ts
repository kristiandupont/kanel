import type { Schema } from "extract-pg-schema";
import type { ConstantDeclaration, KanelContext } from "kanel";
import { makePgTsGenerator } from "kanel";
import { expect, it } from "vitest";

import { makeGenerateZodSchemas } from "./generateZodSchemas";

// Use the same CommonJS context instance as makePgTsGenerator.
const { runWithContext } =
  require("kanel/build/context") as typeof import("kanel/build/context");

it.each(
  [undefined, true, false].flatMap((castToSchema) =>
    [
      ["table", "tables"],
      ["view", "views"],
      ["materializedView", "materializedViews"],
      ["compositeType", "compositeTypes"],
    ].map(([kind, collection]) => ({ castToSchema, kind, collection })),
  ),
)(
  "Should preserve schema types for $kind with castToSchema=$castToSchema",
  async ({ castToSchema, kind, collection }) => {
    const properties = [
      {
        name: "id",
        type: { fullName: "pg_catalog.int4", kind: "base" },
        isArray: false,
        dimensions: 0,
        references: [],
        isNullable: false,
        isPrimaryKey: kind === "table",
        isIdentity: false,
        defaultValue: null,
        comment: null,
      },
    ];
    const context: KanelContext = {
      typescriptConfig: { enumStyle: "literal-union" },
      config: { connection: {}, schemas: ["public"] },
      schemas: {
        public: {
          name: "public",
          [collection]: [
            {
              schemaName: "public",
              name: "users",
              kind,
              ...(kind === "compositeType"
                ? { attributes: properties }
                : { columns: properties }),
            },
          ],
        } as unknown as Schema,
      },
    };

    const output = await runWithContext(context, async () =>
      makePgTsGenerator({
        preRenderHooks: [makeGenerateZodSchemas({ castToSchema })],
      })(),
    );
    const file = output["public/Users"];
    if (file.fileType !== "typescript") throw new Error("Expected TS file");
    const schemas = file.declarations.filter(
      (d): d is ConstantDeclaration => d.declarationType === "constant",
    );
    const casts = castToSchema !== false;
    const objectSchema = (type: string, optional = false) => [
      "z.object({",
      `  id: ${kind === "table" ? "usersId" : "z.number()"}${optional ? ".optional()" : ""},`,
      casts ? `}) as unknown as z.ZodType<${type}>` : "})",
    ];

    expect(schemas.map(({ name, value }) => ({ name, value }))).toEqual([
      ...(kind === "table"
        ? [
            {
              name: "usersId",
              value: casts
                ? "z.number() as unknown as z.ZodType<UsersId>"
                : "z.number().transform(value => value as UsersId)",
            },
          ]
        : []),
      { name: "users", value: objectSchema("Users") },
      ...(kind === "table"
        ? [
            {
              name: "usersInitializer",
              value: objectSchema("UsersInitializer"),
            },
            {
              name: "usersMutator",
              value: objectSchema("UsersMutator", true),
            },
          ]
        : []),
    ]);
  },
);
