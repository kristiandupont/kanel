import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import type { Schema, TableColumn, TableDetails } from "extract-pg-schema";
import type { ConstantDeclaration, KanelContext } from "kanel";
import { makePgTsGenerator } from "kanel";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { expect, it } from "vitest";

import generateZodSchemas, {
  makeGenerateZodSchemas,
} from "./generateZodSchemas";

// kanel is CommonJS. Load its context module with require so that it is the
// same instance that makePgTsGenerator and resolveType read from.
const { runWithContext } =
  require("kanel/build/context") as typeof import("kanel/build/context");
const { default: renderTsFile } =
  require("kanel/build/ts-utilities/renderTsFile") as typeof import("kanel/build/ts-utilities/renderTsFile");

const makeColumn = (
  name: string,
  fullName: string,
  extra: Partial<TableColumn> = {},
): TableColumn =>
  ({
    name,
    type: { fullName, kind: "base" },
    isArray: false,
    dimensions: 0,
    references: [],
    isNullable: false,
    isPrimaryKey: false,
    isIdentity: false,
    defaultValue: null,
    comment: null,
    ...extra,
  }) as TableColumn;

const makeTable = (
  schemaName: string,
  name: string,
  columns: TableColumn[],
): TableDetails => ({ schemaName, name, kind: "table", columns }) as any;

const makeSchema = (name: string, tables: TableDetails[]): Schema =>
  ({
    name,
    tables,
    foreignTables: [],
    views: [],
    materializedViews: [],
    compositeTypes: [],
    enums: [],
    ranges: [],
    domains: [],
    functions: [],
    procedures: [],
  }) as Schema;

const reference = (schemaName: string, tableName: string) => ({
  name: `${tableName}_fkey`,
  schemaName,
  tableName,
  columnName: "id",
  onDelete: "NO ACTION" as const,
  onUpdate: "NO ACTION" as const,
});

it("Should use the branded identifier schema for foreign keys into another schema", async () => {
  const schemas = {
    auth: makeSchema("auth", [
      makeTable("auth", "users", [
        makeColumn("id", "pg_catalog.uuid", { isPrimaryKey: true }),
      ]),
    ]),
    public: makeSchema("public", [
      makeTable("public", "users", [
        makeColumn("id", "pg_catalog.uuid", { isPrimaryKey: true }),
      ]),
      makeTable("public", "posts", [
        makeColumn("auth_user_id", "pg_catalog.uuid", {
          references: [reference("auth", "users")],
        }),
        makeColumn("user_id", "pg_catalog.uuid", {
          references: [reference("public", "users")],
        }),
      ]),
    ]),
  };

  const context: KanelContext = {
    typescriptConfig: { enumStyle: "literal-union" },
    config: { connection: {}, schemas: ["auth", "public"] },
    schemas,
  };

  const output = await runWithContext(context, async () =>
    makePgTsGenerator({ preRenderHooks: [generateZodSchemas] })(),
  );

  const posts = output["public/Posts"];
  if (posts.fileType !== "typescript") throw new Error("Expected TS file");
  const postsSchema = posts.declarations.find(
    (d) => d.declarationType === "constant" && d.name === "posts",
  ) as ConstantDeclaration;

  expect(postsSchema.value).toContain(
    "  auth_user_id: z.lazy(() => auth_usersId),",
  );
  expect(postsSchema.value).toContain("  user_id: z.lazy(() => usersId),");
  expect(postsSchema.typeImports).toContainEqual(
    expect.objectContaining({
      name: "usersId",
      asName: "auth_usersId",
      path: "auth/Users",
    }),
  );
  expect(postsSchema.typeImports).toContainEqual(
    expect.objectContaining({
      name: "usersId",
      asName: undefined,
      path: "public/Users",
    }),
  );
});

const moduleCases = [true, false].flatMap((castToSchema) =>
  ["esm", "cjs"].map((format) => ({ castToSchema, format })),
);

it.each(
  moduleCases.flatMap((options) =>
    [false, true].map((mixedCycle) => ({ ...options, mixedCycle })),
  ),
)(
  "Should load and validate cycles with castToSchema=$castToSchema, format=$format, mixedCycle=$mixedCycle",
  async ({ castToSchema, format, mixedCycle }) => {
    const schemas = {
      auth: makeSchema("auth", [
        makeTable("auth", "users", [
          makeColumn("id", "pg_catalog.uuid", { isPrimaryKey: true }),
          makeColumn("primary_post_id", "pg_catalog.int4", {
            references: [reference("public", "posts")],
            isNullable: true,
          }),
        ]),
      ]),
      public: makeSchema("public", [
        makeTable("public", "posts", [
          makeColumn("id", "pg_catalog.int4", {
            isPrimaryKey: true,
            isIdentity: true,
          }),
          makeColumn("author_id", "pg_catalog.uuid", {
            references: [
              mixedCycle
                ? reference("public", "comments")
                : reference("auth", "users"),
            ],
            isNullable: mixedCycle,
          }),
        ]),
        ...(mixedCycle
          ? [
              makeTable("public", "comments", [
                makeColumn("id", "pg_catalog.uuid", { isPrimaryKey: true }),
                makeColumn("author_id", "pg_catalog.uuid", {
                  references: [reference("auth", "users")],
                  isNullable: true,
                }),
              ]),
            ]
          : []),
      ]),
    };
    const extension = format === "esm" ? ".mjs" : ".cjs";
    const context: KanelContext = {
      typescriptConfig: {
        enumStyle: "literal-union",
        importsExtension: extension,
      },
      config: { connection: {}, schemas: ["auth", "public"] },
      schemas,
    };
    const directory = mkdtempSync(join(process.cwd(), "generated-zod-"));

    try {
      await runWithContext(context, async () => {
        const output = await makePgTsGenerator({
          preRenderHooks: [makeGenerateZodSchemas({ castToSchema })],
        })();
        for (const [path, file] of Object.entries(output)) {
          if (file.fileType !== "typescript") continue;
          const source = renderTsFile(file.declarations, path).join("\n");
          const { outputText } = transpileModule(source, {
            compilerOptions: {
              module:
                format === "esm" ? ModuleKind.ESNext : ModuleKind.CommonJS,
              target: ScriptTarget.ESNext,
            },
          });
          const filename = join(directory, `${path}${extension}`);
          mkdirSync(dirname(filename), { recursive: true });
          writeFileSync(filename, outputText);
        }
      });

      const moduleUrl = (path: string) =>
        pathToFileURL(join(directory, `${path}${extension}`)).href;
      const usersUrl = moduleUrl("auth/Users");
      const postsUrl = moduleUrl("public/Posts");
      const commentsUrl = moduleUrl("public/Comments");
      const entries = mixedCycle
        ? [usersUrl, postsUrl, commentsUrl]
        : [usersUrl, postsUrl];
      for (const entryUrl of entries) {
        execFileSync(process.execPath, [
          "--input-type=module",
          "--eval",
          `
            import assert from "node:assert/strict";
            await import(${JSON.stringify(entryUrl)});
            const { users, usersInitializer, usersMutator } = await import(${JSON.stringify(usersUrl)});
            const { posts, postsInitializer, postsMutator } = await import(${JSON.stringify(postsUrl)});
            const id = "123e4567-e89b-42d3-a456-426614174000";
            assert.deepEqual(users.parse({ id, primary_post_id: 1 }), { id, primary_post_id: 1 });
            assert.deepEqual(posts.parse({ id: 1, author_id: id }), { id: 1, author_id: id });
            assert.equal(users.safeParse({ id, primary_post_id: "bad" }).success, false);
            assert.equal(posts.safeParse({ id: 1, author_id: "bad" }).success, false);
            assert.equal(users.safeParse({ id, primary_post_id: null }).success, true);
            assert.equal(users.safeParse({ id }).success, false);
            assert.equal(posts.safeParse({ id: 1, author_id: null }).success, ${mixedCycle});
            assert.equal(posts.safeParse({ id: 1 }).success, false);
            assert.equal(usersInitializer.safeParse({ id }).success, true);
            assert.equal(postsInitializer.safeParse({ author_id: id }).success, true);
            assert.equal(postsInitializer.safeParse({}).success, ${mixedCycle});
            assert.equal(usersMutator.safeParse({}).success, true);
            assert.equal(postsMutator.safeParse({}).success, true);
            assert.equal(usersMutator.safeParse({ primary_post_id: null }).success, true);
            assert.equal(postsMutator.safeParse({ author_id: "bad" }).success, false);
            if (${mixedCycle}) {
              const { comments, commentsInitializer, commentsMutator } = await import(${JSON.stringify(commentsUrl)});
              assert.deepEqual(comments.parse({ id, author_id: id }), { id, author_id: id });
              assert.equal(comments.safeParse({ id, author_id: "bad" }).success, false);
              assert.equal(comments.safeParse({ id, author_id: null }).success, true);
              assert.equal(comments.safeParse({ id }).success, false);
              assert.equal(commentsInitializer.safeParse({ id }).success, true);
              assert.equal(commentsMutator.safeParse({}).success, true);
              assert.equal(commentsMutator.safeParse({ author_id: "bad" }).success, false);
            }
          `,
        ]);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
