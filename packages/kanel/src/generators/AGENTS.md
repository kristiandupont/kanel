# generators

V4 generator pipeline. Each file handles one PostgreSQL object kind and produces `Output` objects (TypeScript declarations or Markdown).

**Orchestrator:** `makePgTsGenerator.ts` — wires up all sub-generators and returns the combined generator function passed to `processDatabase()`. `pgTsGeneratorContext.ts` holds the shared context (type maps, metadata functions) threaded through generators.

**Per-kind generators:** `enumsGenerator.ts`, `domainsGenerator.ts`, `rangesGenerator.ts`, `makeCompositeGenerator.ts`, `makeRoutineGenerator.ts`, `makeMarkdownGenerator.ts`.

**Shared utilities:** `generateProperties.ts` (column→TS property), `resolveType.ts` (PG type→TS type resolution), `wrapWithBuiltin.ts` (merges user metadata with built-in defaults).

**Type scaffolding:** `composite-types.ts`, `routine-types.ts` — output shape definitions specific to each generator.
