# kanel-seeder/src

Generates type-safe seed data inserters from a declarative `SeedData` specification.

- `SeedData.ts` — types describing the seed specification format
- `seedInput.ts` — parses and normalises raw seed input
- `preprocessData.ts` — validates and resolves cross-references in seed data before generation
- `makeGenerateSeeds.ts` — code-generation hook that emits seed inserter source files
- `makeSeeder.ts` — runtime utility that executes the seed inserts against a live database
