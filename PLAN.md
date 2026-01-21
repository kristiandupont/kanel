# V4 upgrade plan

## Overview

The configuration is being rearranged to better separate concerns:
- **Core config**: Connection and general database extraction settings
- **TypescriptConfig**: General TypeScript output settings (module format, enum style) - affects all TS output
- **PgTsGeneratorConfig**: Specific configuration for transforming PostgreSQL types to TypeScript (name transformation, metadata, etc.)

The current "generators" (composite, enum, domains, etc.) are actually sub-generators that will be moved into a `PgTsGenerator` folder. The term "Generator" is now a top-level concept.

Hooks and generators access configuration via AsyncLocalStorage context (using `useKanelContext()`) instead of having it passed as parameters.

## New config types

```ts
// General TypeScript output configuration - affects all TypeScript generators
type TypescriptConfig = {
  enumStyle: "literal" | "enum";  // Affects type stripping vs compilation
  tsModuleFormat?: "esm" | "commonjs" | "explicit-esm" | "explicit-commonjs";
};

// A generator produces output files. Generators run sequentially.
// Last to write wins - generators should NOT depend on output from previous generators.
// If you need to transform output from another generator, use a PreRenderHook instead.
type Generator = () => Awaitable<Output>;

// Hooks access context via useKanelContext() instead of parameters
export type PreRenderHook = (outputAcc: Output) => Awaitable<Output>;

export type PostRenderHook = (
  path: string,
  lines: string[],
) => Awaitable<string[]>;

type Config = {
  // Database connection settings
  connection: string | ConnectionConfig;
  schemaNames?: string[];
  typeFilter?: (pgType: PgType) => boolean;
  resolveViews?: boolean;

  // General TypeScript settings (affects all TS generators)
  typescriptConfig: TypescriptConfig;

  // Output settings
  outputPath?: string;
  preDeleteOutputFolder?: boolean;

  // Top-level generators and hooks
  generators: Generator[];
  preRenderHooks?: PreRenderHook[];
  postRenderHooks?: PostRenderHook[];
};
```

## PgTsGenerator

This generator transforms PostgreSQL types into TypeScript types. The current "generators" (composite, enum, domains, ranges, routines) are actually sub-generators that will live inside the PgTsGenerator folder.

Configuration that was previously at the top level (like `getMetadata`, `customTypeMap`) is now specific to this generator.

```ts
type PgTsGeneratorConfig = {
  customTypeMap?: TypeMap;

  // Metadata functions control name transformation and documentation
  getMetadata: GetMetadata;
  getPropertyMetadata: GetPropertyMetadata;
  generateIdentifierType?: GenerateIdentifierType;
  getRoutineMetadata?: GetRoutineMetadata;
  propertySortFunction: (a: CompositeProperty, b: CompositeProperty) => number;
};

function makePgTsGenerator(config: PgTsGeneratorConfig): Generator {
  return async () => {
    const context = useKanelContext();
    // Run sub-generators: composite, enum, domains, ranges, routines
    // Return Output
  };
}
```

## Other Generators

These currently exist as pre-render hooks but will be converted to generators:

- **KyselyGenerator**: Creates Kysely database interface types
- **ZodGenerator**: Creates Zod schemas for validation
- **KnexGenerator**: Creates Knex type definitions

Each will access context via `useKanelContext()` and can read the schemas directly.

New generator:
- **MarkdownGenerator**: Generates LLM- and human-friendly markdown documentation of the database (details TBD)

## Context

Instead of containing a single "instantiated config", the context will now contain clearly separated concerns:

- **TypescriptConfig**: Where `tsModuleFormat`, if not provided, will be derived from package.json and TypeScript config files
- **Original config**: As passed to the processDatabase function
- **Schemas**: The extracted database schemas

```ts
type KanelContext = {
  typescriptConfig: TypescriptConfig;
  config: Config;
  schemas: Record<string, Schema>;
};
```

Access via:
```ts
const context = useKanelContext();
// Or potentially more specific accessors:
// useTypescriptConfig(), useSchemas(), etc.
```

## Migration notes

### Code organization
- Move existing generators (composite, enum, domains, ranges, routines) into `src/PgTsGenerator/`
- These become internal sub-generators of PgTsGenerator

### Breaking changes
- `getMetadata`, `getPropertyMetadata`, `generateIdentifierType`, `getRoutineMetadata`, `propertySortFunction`, and `customTypeMap` move from top-level Config to PgTsGeneratorConfig
- Hooks no longer receive `instantiatedConfig` as a parameter - must use `useKanelContext()` instead
- Pre-render hooks that currently modify TS output (Kysely, Zod, Knex) become generators

### Example V4 config
```ts
import { makePgTsGenerator, makeKyselyGenerator, makeZodGenerator } from 'kanel';

const config: Config = {
  connection: { /* ... */ },
  typescriptConfig: {
    enumStyle: 'literal',
    tsModuleFormat: 'esm',
  },
  outputPath: './models',
  generators: [
    makePgTsGenerator({
      getMetadata: myGetMetadata,
      getPropertyMetadata: myGetPropertyMetadata,
      customTypeMap: { /* ... */ },
      // ...
    }),
    makeKyselyGenerator(),
    makeZodGenerator(),
  ],
};
```

## Open design questions

### Generator vs PreRenderHook semantics

**Decision needed**: Clarify the distinction between generators and pre-render hooks.

**Current thinking**:
- **Generators**: Produce output that gets **merged** into the final result. Can optionally receive accumulated output for reference (read-only use).
  ```ts
  type Generator = (outputSoFar?: Output) => Awaitable<Output>;
  ```
- **PreRenderHooks**: Can transform/remove/replace anything in the accumulated output.
  ```ts
  type PreRenderHook = (outputAcc: Output) => Awaitable<Output>;
  ```

This allows Kysely and Zod to remain as generators (they add/merge declarations to files), while hooks like `generateIndexFile` can modify/add to the entire output.

### The applyTaggedComments problem

**Problem**: The `applyTaggedComments` hook currently:
- Reads `@type` tags from database comments
- Overrides type resolution for specific columns/types
- Requires access to `getMetadata` (which is moving to PgTsGeneratorConfig)
- Is essentially an extension to the PgTs generator's behavior

This is really about **type override configuration**. Currently, type overrides can happen in multiple places:
1. `customTypeMap` - Override by PostgreSQL type name
2. `@type` tags in DB comments - Override via `applyTaggedComments` hook
3. `getPropertyMetadata` - Can return `typeOverride` for individual properties

**Options being considered**:

**Option 1: Generator-specific hooks**
- Add `postProcessHooks` to `PgTsGeneratorConfig`
- Hooks run after sub-generators, have access to config via closure
- Clear ownership, flexible
- Downside: Another concept to learn

**Option 2: Make it built-in to PgTsGenerator**
- Add `processTaggedComments?: boolean` to config
- Downside: Hardcoded, less flexible

**Option 3: Composable getter utilities**
- Provide pre-built getters that compose: `withTaggedComments`, `withCustomTypes`, etc.
- Users compose them: `getPropertyMetadata: withTaggedComments(withCustomTypes(...))`
- Downside: Nested function calls get ugly, not very ergonomic

**Option 4: Powerful getters + composition helper** ⭐ *Current favorite*
- Make getters more powerful and provide a `composePropertyMetadata` utility
- Provide pre-built getters: `taggedCommentsGetPropertyMetadata`, `makeCustomTypesGetter`, etc.
- Clean composition:
  ```ts
  getPropertyMetadata: composePropertyMetadata(
    defaultGetPropertyMetadata,
    taggedCommentsGetPropertyMetadata,
    makeCustomTypesGetter({ 'public.users.metadata': 'JsonValue' }),
  )
  ```
- Pros: No new concepts, backwards compatible, clean, flexible
- `applyTaggedComments` becomes `taggedCommentsGetPropertyMetadata` - a getter instead of a hook

**Decision**: TBD - need to evaluate composability and ergonomics further.

### resolveType complexity

**Question**: Could moving `customTypeMap` to a composable getter simplify the `resolveType` function?

**Analysis**: The complexity in `resolveType` is NOT from `customTypeMap` (which is just one check on line 238). The real complexity comes from:
1. Circular reference tracking (necessary complexity)
2. Repetitive schema lookups - searching tables/views/materialized views in multiple places (~50-100 lines of repetition)
3. Deep nesting and multiple responsibilities

**Recommendation**:
- **Don't** move `customTypeMap` to a getter - it's in the right place conceptually (after structural resolution, before DB type resolution)
- **Do** extract schema lookup utilities (e.g., `findComposite`, `findTable`) to eliminate repetitive code
- This would make `resolveType` much more readable without architectural changes

Moving `customTypeMap` to a getter would add complexity (performance hit, less clear semantics) without meaningfully simplifying `resolveType`.
