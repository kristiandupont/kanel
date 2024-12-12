import type { PgType } from "extract-pg-schema";

export const kyselyTypeFilter = (table: PgType): boolean =>
  !["kysely_migration", "kysely_migration_lock"].includes(table.name);
