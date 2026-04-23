# kanel-enum-tables/src

Generates TypeScript union types from table rows rather than from PostgreSQL enum types.

`enumTablesPreRenderHook.ts` is the entire implementation: it reads rows from specified tables at generation time and emits union type declarations. `index.ts` re-exports it.
