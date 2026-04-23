# kanel-zod/src

Generates Zod validation schemas corresponding to kanel-generated TypeScript types.

**Entry point:** `generateZodSchemas.ts` — pre-render hook that emits Zod schema declarations for all supported PG object kinds.

**Type mapping:** `defaultZodTypeMap.ts` maps PostgreSQL types to Zod schema expressions.

**Per-kind processors:** `processEnum.ts`, `processComposite.ts`, `processDomain.ts`, `processRange.ts` — each handles one PG object kind.

**Utilities:** `zImport.ts` (Zod import generation), `zodCamelCaseHook.ts` (snake_case→camelCase), `getIdentifierDeclaration.ts`, `generateProperties.ts`.

`GenerateZodSchemasConfig.ts` defines hook configuration and metadata function signatures.
