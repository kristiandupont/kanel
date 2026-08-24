# mocks

Static schema fixtures for unit tests — serialized `extract-pg-schema` results, used to test generators without a live database.

- `dvdrental.json` — the PostgreSQL dvdrental demo database.
- `crossSchemaViews.ts` — a small schema where a curated schema exposes views that carry the same name as the relation they select from (`api.accounts` -> `public.accounts` -> `public.account_records`). Typed rather than JSON so the fixture is checked against `extract-pg-schema`'s types.

Mock `extractSchemas` with one of these and call `processDatabase` to assert on rendered output.
