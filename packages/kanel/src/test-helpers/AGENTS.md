# test-helpers

Shared utilities for integration tests.

- `startTestContainer.ts` / `usePostgresContainer.ts` — spin up and tear down a PostgreSQL Docker container
- `useSchema.ts` — create and drop a named schema around each test
- `useTestKnex.ts` — provide a configured Knex connection to the container
- `globalSetup.ts` — Jest global setup hook
