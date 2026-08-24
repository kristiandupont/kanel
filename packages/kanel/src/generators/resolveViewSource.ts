import type {
  ForeignTableColumn,
  ForeignTableDetails,
  MaterializedViewColumn,
  MaterializedViewDetails,
  Schema,
  TableColumn,
  TableDetails,
  ViewColumn,
  ViewDetails,
} from "extract-pg-schema";

import type { CompositeDetails, CompositeProperty } from "./composite-types";

/** A relation that a view column can originate from. */
export type SourceRelation =
  | TableDetails
  | ForeignTableDetails
  | ViewDetails
  | MaterializedViewDetails;

type SourceColumn =
  | TableColumn
  | ForeignTableColumn
  | ViewColumn
  | MaterializedViewColumn;

/** The link extract-pg-schema records from a view column to its origin. */
export type ViewSource = NonNullable<ViewColumn["source"]>;

export type ColumnOrigin = {
  column: SourceColumn;
  details: SourceRelation;
};

/**
 * Narrows to a column that extract-pg-schema was able to trace back to a
 * relation -- a view, materialized view or foreign table column.
 */
export const hasSource = (
  column: CompositeProperty,
): column is CompositeProperty & { source: ViewSource } =>
  "source" in column && column.source != null;

/**
 * A relation is only *itself* when both its schema and its name match. Testing
 * the name alone would discard a legitimate same-named relation in a different
 * schema, which is a common pattern for API layers built as thin wrappers
 * (`api.users` selecting from `public.users`).
 */
const isSelfReference = (
  relation: SourceRelation,
  details: CompositeDetails,
): boolean =>
  relation.name === details.name && relation.schemaName === details.schemaName;

/**
 * A candidate has to actually carry the column being looked for. An
 * unqualified relation is recorded against the view's own schema, so
 * `select instructions from accounts` inside `api.accounts_lite` arrives as
 * `api.accounts` -- a real, same-named relation that may well be a curated
 * view which omits that column. Only the relation that has it can be the
 * source.
 */
const carriesColumn = (
  relation: SourceRelation,
  source: ViewSource,
): boolean => {
  const columns: SourceColumn[] = relation.columns;
  return columns.some((c) => c.name === source.column);
};

const findInSchema = (
  schema: Schema | undefined,
  source: ViewSource,
  details: CompositeDetails,
): SourceRelation | undefined =>
  [
    ...(schema?.tables ?? []),
    ...(schema?.foreignTables ?? []),
    ...(schema?.views ?? []),
    ...(schema?.materializedViews ?? []),
  ].find(
    (relation) =>
      relation.name === source.table &&
      !isSelfReference(relation, details) &&
      carriesColumn(relation, source),
  );

/**
 * Find the relation that a view column's source points at. An unqualified
 * relation in a view definition is recorded against the view's own schema, so
 * fall back to `public` the way the default search_path would.
 */
export const findSourceRelation = (
  source: ViewSource,
  details: CompositeDetails,
  schemas: Record<string, Schema>,
): SourceRelation | undefined =>
  findInSchema(schemas[source.schema], source, details) ??
  findInSchema(schemas["public"], source, details);

/**
 * Follow a source link to the column it ultimately originates from, stepping
 * through any number of intermediate views.
 *
 * Returns undefined when the chain cannot be followed all the way -- a missing
 * relation or column, or a view that (directly or indirectly) feeds itself.
 * Callers should then keep whatever value they already have rather than adopt
 * a half-resolved one.
 *
 * Each step either stops or records the column it stepped onto in `seen`, and
 * a set of schemas holds finitely many columns, so the recursion terminates.
 */
export const findOriginColumn = (
  source: ViewSource,
  details: CompositeDetails,
  schemas: Record<string, Schema>,
  seen: ReadonlySet<CompositeProperty> = new Set(),
): ColumnOrigin | undefined => {
  const relation = findSourceRelation(source, details, schemas);
  const column = relation?.columns.find((c) => c.name === source.column);
  if (!relation || !column) {
    return undefined;
  }

  if (!hasSource(column)) {
    return { column, details: relation };
  }
  if (seen.has(column)) {
    return undefined;
  }

  return findOriginColumn(
    column.source,
    relation,
    schemas,
    new Set(seen).add(column),
  );
};
