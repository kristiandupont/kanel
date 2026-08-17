import type { Schema, TableDetails, ViewDetails } from "extract-pg-schema";

/**
 * A serialized `extract-pg-schema` result modelling the pattern where a
 * curated schema exposes views that carry the same name as the relation they
 * select from:
 *
 *     public.account_records (table)
 *       <- public.accounts (view)
 *         <- api.accounts (view)
 *           <- api.accounts_details (view)
 *
 * `api.accounts` and `public.accounts` share a name but are different
 * relations, so both the type and the nullability have to survive a same-named
 * hop, and then keep surviving one more hop within `api` to reach
 * `account_records`.
 */

const emptySchema = {
  domains: [],
  enums: [],
  ranges: [],
  tables: [],
  foreignTables: [],
  views: [],
  materializedViews: [],
  compositeTypes: [],
  functions: [],
  procedures: [],
};

const tableColumn = (
  name: string,
  fullName: string,
  isNullable: boolean,
  isPrimaryKey = false,
) => ({
  name,
  expandedType: fullName,
  type: { fullName, kind: "base" },
  comment: null,
  defaultValue: null,
  isArray: false,
  isPrimaryKey,
  isNullable,
  isIdentity: false,
  generated: "NEVER",
  references: [],
  indices: [],
});

const viewColumn = (
  name: string,
  fullName: string,
  source: { schema: string; table: string; column: string },
) => ({
  name,
  expandedType: fullName,
  type: { fullName, kind: "base" },
  comment: null,
  defaultValue: null,
  isArray: false,
  isNullable: true,
  isIdentity: false,
  generated: "NEVER",
  source,
  references: [],
});

export const accountRecords: TableDetails = {
  name: "account_records",
  schemaName: "public",
  kind: "table",
  comment: null,
  columns: [
    tableColumn("id", "pg_catalog.int4", false, true),
    tableColumn("required_name", "pg_catalog.text", false),
    tableColumn("optional_name", "pg_catalog.text", true),
    tableColumn("secret", "pg_catalog.text", true),
  ],
  indices: [],
  informationSchemaValue: {
    table_schema: "public",
    table_name: "account_records",
  },
} as any;

export const publicAccounts: ViewDetails = {
  name: "accounts",
  schemaName: "public",
  kind: "view",
  comment: null,
  definition: "select * from public.account_records",
  columns: [
    viewColumn("id", "pg_catalog.int4", {
      schema: "public",
      table: "account_records",
      column: "id",
    }),
    viewColumn("required_name", "pg_catalog.text", {
      schema: "public",
      table: "account_records",
      column: "required_name",
    }),
    viewColumn("optional_name", "pg_catalog.text", {
      schema: "public",
      table: "account_records",
      column: "optional_name",
    }),
  ],
  informationSchemaValue: { table_schema: "public", table_name: "accounts" },
} as any;

/** Selects from the same-named `public.accounts`, not from itself. */
export const apiAccounts: ViewDetails = {
  name: "accounts",
  schemaName: "api",
  kind: "view",
  comment: null,
  definition: "select * from public.accounts",
  columns: [
    viewColumn("id", "pg_catalog.int4", {
      schema: "public",
      table: "accounts",
      column: "id",
    }),
    viewColumn("required_name", "pg_catalog.text", {
      schema: "public",
      table: "accounts",
      column: "required_name",
    }),
    viewColumn("optional_name", "pg_catalog.text", {
      schema: "public",
      table: "accounts",
      column: "optional_name",
    }),
  ],
  informationSchemaValue: { table_schema: "api", table_name: "accounts" },
} as any;

/** A foreign table is a valid source too, and lives in its own schema list. */
export const externalLedger = {
  name: "ledger",
  schemaName: "public",
  kind: "foreignTable",
  comment: null,
  columns: [
    { ...tableColumn("id", "pg_catalog.int4", false, true), source: null },
    { ...tableColumn("memo", "pg_catalog.text", true), source: null },
    /*
     * A foreign table only reports nullability once it has been resolved, so
     * `isNullable` is absent here on purpose -- adopting it would silently
     * turn a nullable column non-null.
     */
    {
      name: "note",
      expandedType: "pg_catalog.text",
      type: { fullName: "pg_catalog.text", kind: "base" },
      comment: null,
      defaultValue: null,
      isArray: false,
      generated: "NEVER",
      references: [],
      source: null,
    },
  ],
  informationSchemaValue: { table_schema: "public", table_name: "ledger" },
} as any;

export const apiLedger: ViewDetails = {
  name: "ledger",
  schemaName: "api",
  kind: "view",
  comment: null,
  definition: "select * from public.ledger",
  columns: [
    viewColumn("memo", "pg_catalog.text", {
      schema: "public",
      table: "ledger",
      column: "memo",
    }),
    viewColumn("note", "pg_catalog.text", {
      schema: "public",
      table: "ledger",
      column: "note",
    }),
  ],
  informationSchemaValue: { table_schema: "api", table_name: "ledger" },
} as any;

/**
 * One more hop, this time within `api`. A reference to a relation in a schema
 * that is not on the search_path keeps its qualifier, so this arrives as a
 * genuine `api` source rather than an inferred one.
 */
export const apiAccountsDetails: ViewDetails = {
  name: "accounts_details",
  schemaName: "api",
  kind: "view",
  comment: null,
  definition: "select * from api.accounts",
  columns: [
    viewColumn("id", "pg_catalog.int4", {
      schema: "api",
      table: "accounts",
      column: "id",
    }),
    viewColumn("required_name", "pg_catalog.text", {
      schema: "api",
      table: "accounts",
      column: "required_name",
    }),
    viewColumn("optional_name", "pg_catalog.text", {
      schema: "api",
      table: "accounts",
      column: "optional_name",
    }),
  ],
  informationSchemaValue: {
    table_schema: "api",
    table_name: "accounts_details",
  },
} as any;

/**
 * A curated view that deliberately omits `secret`, so it cannot be the source
 * of a reference to that column even though it carries the right name.
 */
export const apiRecords: ViewDetails = {
  name: "account_records",
  schemaName: "api",
  kind: "view",
  comment: null,
  definition: "select id from public.account_records",
  columns: [
    viewColumn("id", "pg_catalog.int4", {
      schema: "public",
      table: "account_records",
      column: "id",
    }),
  ],
  informationSchemaValue: {
    table_schema: "api",
    table_name: "account_records",
  },
} as any;

/**
 * `select secret from account_records` -- unqualified, so the source is
 * recorded against this view's own schema and points at the curated
 * `api.account_records`, which does not carry `secret`.
 */
export const apiSecrets: ViewDetails = {
  name: "account_secrets",
  schemaName: "api",
  kind: "view",
  comment: null,
  definition: "select secret from account_records",
  columns: [
    {
      ...viewColumn("secret", "pg_catalog.text", {
        schema: "api",
        table: "account_records",
        column: "secret",
      }),
      /* Only resolving through to the table's nullable `secret` makes this null. */
      isNullable: false,
    },
  ],
  informationSchemaValue: {
    table_schema: "api",
    table_name: "account_secrets",
  },
} as any;

const crossSchemaViews: Record<string, Schema> = {
  public: {
    ...emptySchema,
    name: "public",
    tables: [accountRecords],
    foreignTables: [externalLedger],
    views: [publicAccounts],
  },
  api: {
    ...emptySchema,
    name: "api",
    views: [apiAccounts, apiAccountsDetails, apiLedger, apiRecords, apiSecrets],
  },
};

export default crossSchemaViews;
