# kanel-kysely/src

Generates a Kysely `Database` interface and related helper types from a kanel-processed schema.

**Key exports:** `makeKyselyHook.ts` is the primary pre-render hook that produces the typed `Database` interface and table builders; `kyselyCamelCaseHook.ts` converts snake_case column names to camelCase for Kysely conventions; `kyselyTypeFilter.ts` filters output to types relevant to Kysely; `processFile.ts` handles per-file transformation; `MakeKyselyConfig.ts` defines hook configuration.
