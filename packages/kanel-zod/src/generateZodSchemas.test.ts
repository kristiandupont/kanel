import type { Schema, TableColumn, TableDetails } from "extract-pg-schema";
import type { ConstantDeclaration, KanelContext } from "kanel";
import { makePgTsGenerator } from "kanel";
import { expect, it } from "vitest";

import generateZodSchemas from "./generateZodSchemas";

// kanel is CommonJS. Load its context module with require so that it is the
// same instance that makePgTsGenerator and resolveType read from.
const { runWithContext } =
  require("kanel/build/context") as typeof import("kanel/build/context");

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

  expect(postsSchema.value).toContain("  auth_user_id: auth_usersId,");
  expect(postsSchema.value).toContain("  user_id: usersId,");
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
