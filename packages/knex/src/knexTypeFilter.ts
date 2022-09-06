import type { PgType } from 'extract-pg-schema';

const knexTypeFilter = (t: PgType) =>
  !['knex_migrations', 'knex_migrations_lock'].some((v) => v === t.name);

export default knexTypeFilter;
