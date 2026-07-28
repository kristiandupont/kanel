import { describe, expect, it } from "vitest";
import type { Schema, ViewDetails } from "extract-pg-schema";

import crossSchemaViews, {
  accountRecords,
  apiAccounts,
  apiAccountsDetails,
  apiSecrets,
  publicAccounts,
} from "../mocks/crossSchemaViews";
import { findOriginColumn, findSourceRelation } from "./resolveViewSource";

const sourceOf = (view: ViewDetails, columnName: string) => {
  const column = view.columns.find((c) => c.name === columnName);
  if (!column?.source) {
    throw new Error(`${view.name}.${columnName} has no source`);
  }
  return column.source;
};

/**
 * A view that feeds itself, and a pair that feed each other. Neither shape is
 * representative enough to belong in the shared fixture, but both have to
 * terminate rather than recurse forever.
 */
const selfFeeding = {
  name: "loop",
  schemaName: "api",
  kind: "view",
  columns: [
    { name: "id", source: { schema: "api", table: "loop", column: "id" } },
  ],
} as unknown as ViewDetails;

const pingPong = ["ping", "pong"].map(
  (name, index) =>
    ({
      name,
      schemaName: "api",
      kind: "view",
      columns: [
        {
          name: "id",
          source: {
            schema: "api",
            table: index === 0 ? "pong" : "ping",
            column: "id",
          },
        },
      ],
    }) as unknown as ViewDetails,
);

const withViews = (views: ViewDetails[]): Record<string, Schema> => ({
  ...crossSchemaViews,
  api: { ...crossSchemaViews.api, views },
});

describe("findSourceRelation", () => {
  it("finds a same-named view in another schema", () => {
    const source = sourceOf(apiAccounts, "id");
    expect(findSourceRelation(source, apiAccounts, crossSchemaViews)).toBe(
      publicAccounts,
    );
  });

  it("finds the table a view selects from", () => {
    const source = sourceOf(publicAccounts, "id");
    expect(findSourceRelation(source, publicAccounts, crossSchemaViews)).toBe(
      accountRecords,
    );
  });

  it("skips a relation that refers to itself", () => {
    const source = sourceOf(selfFeeding, "id");
    const schemas = withViews([selfFeeding]);
    expect(findSourceRelation(source, selfFeeding, schemas)).toBeUndefined();
  });

  it("skips a same-named relation that does not carry the column", () => {
    const source = sourceOf(apiSecrets, "secret");
    expect(source.schema).toBe("api");
    expect(findSourceRelation(source, apiSecrets, crossSchemaViews)).toBe(
      accountRecords,
    );
  });

  it("falls back to public when the source schema has no match", () => {
    const source = { schema: "reporting", table: "accounts", column: "id" };
    expect(findSourceRelation(source, apiAccounts, crossSchemaViews)).toBe(
      publicAccounts,
    );
  });

  it("returns undefined for an unknown schema rather than throwing", () => {
    const source = { schema: "nope", table: "missing", column: "id" };
    expect(
      findSourceRelation(source, apiAccounts, crossSchemaViews),
    ).toBeUndefined();
  });
});

describe("findOriginColumn", () => {
  it("follows a same-named chain to the originating table column", () => {
    const origin = findOriginColumn(
      sourceOf(apiAccounts, "optional_name"),
      apiAccounts,
      crossSchemaViews,
    );
    expect(origin?.details).toBe(accountRecords);
    expect(origin?.column).toBe(
      accountRecords.columns.find((c) => c.name === "optional_name"),
    );
  });

  it("follows a chain that crosses schemas and then stays within one", () => {
    const origin = findOriginColumn(
      sourceOf(apiAccountsDetails, "optional_name"),
      apiAccountsDetails,
      crossSchemaViews,
    );
    expect(origin?.details).toBe(accountRecords);
    expect(origin?.column.isNullable).toBe(true);
  });

  it("returns undefined when the chain cannot be followed", () => {
    const source = { schema: "public", table: "accounts", column: "gone" };
    expect(
      findOriginColumn(source, apiAccounts, crossSchemaViews),
    ).toBeUndefined();
  });

  it("terminates on a view that feeds itself", () => {
    const schemas = withViews([selfFeeding]);
    expect(
      findOriginColumn(sourceOf(selfFeeding, "id"), selfFeeding, schemas),
    ).toBeUndefined();
  });

  it("terminates on views that feed each other", () => {
    const [ping, pong] = pingPong;
    const schemas = withViews([ping, pong]);
    expect(
      findOriginColumn(sourceOf(ping, "id"), ping, schemas),
    ).toBeUndefined();
  });
});
