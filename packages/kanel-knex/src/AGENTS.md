# kanel-knex/src

Generates Knex.js type-safe table definitions from a kanel-processed schema.

**Key exports:** `generateKnexTablesModule.ts` creates a typed tables object for use with Knex; `generateMigrationCheck.ts` emits migration-validation code; `knexTypeFilter.ts` restricts output to table-level types relevant to Knex queries; `knexImport.ts` handles the Knex import statement.

Integrates as a pre-render hook in the kanel pipeline.
