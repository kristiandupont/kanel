# kanel/src

Core package that extracts a live PostgreSQL schema and generates TypeScript types (and optionally Markdown docs).

**Pipeline entry point:** `processDatabase.ts` — orchestrates schema extraction via `extract-pg-schema`, runs generators and pre-render hooks, merges outputs by file, runs post-render hooks, writes files.

**Config:** V4 is current (`config-types-v4.ts`); V3 is legacy (`config-types.ts`). `config-conversion.ts` migrates V3→V4. `context.ts` exposes the KanelContext via AsyncLocalStorage so generators/hooks can read it without prop-drilling.

**Key types:** `Output.ts` (file output shapes), `Details.ts` (union of all PG object detail types), `Matcher.ts` (filtering logic), `TypeMap.ts` / `defaultTypeMap.ts` (PG→TS type mapping).

**Subfolders:**
- `cli/` — command-line entry point
- `generators/` — one generator per PG object kind (table, enum, composite, domain, range, routine)
- `hooks/` — pre/post-render hooks (index files, Prettier, tagged comments, generated headers)
- `ts-utilities/` — low-level TypeScript AST and code-rendering helpers
- `integration-tests/` — end-to-end tests against a real Postgres container
- `test-helpers/` — Docker container management and schema setup for integration tests
- `mocks/` — static JSON schema fixtures for unit tests
