# preRenderHooks

In Kanel, "rendering" means translating a bunch of declarations into arrays of strings that will ultimately become files.
You can apply hooks before and after this step if you want to make some custom modifications or additions to the final output.

## Two Types of Pre-Render Hooks

In V4, there are two types of pre-render hooks depending on where you configure them:

### 1. Global Pre-Render Hooks

Global hooks are configured at the top level of your config and run after all generators complete:

```typescript
export type PreRenderHook = (
  outputAcc: Output,
) => Awaitable<Output>;
```

Use these for operations that need to work on the complete accumulated output from all generators:

```typescript
import { makePgTsGenerator } from 'kanel';

const config = {
  generators: [makePgTsGenerator()],
  preRenderHooks: [
    // This runs AFTER all generators complete
    (outputAcc) => {
      // Transform all output here
      return outputAcc;
    },
  ],
};
```

To access context (config, schemas, etc.) in a global hook, use [`useKanelContext()`](./useKanelContext.md):

```typescript
import { useKanelContext } from 'kanel';

const myHook = (outputAcc) => {
  const context = useKanelContext();
  // Access context.config, context.schemas, context.typescriptConfig
  return outputAcc;
};
```

See [useKanelContext](./useKanelContext.md) for complete documentation.

### 2. PgTs Generator-Specific Pre-Render Hooks

These hooks are configured inside `makePgTsGenerator()` and receive the `PgTsGeneratorContext` as a parameter:

```typescript
export type PgTsPreRenderHook = (
  outputAcc: Output,
  context: PgTsGeneratorContext,
) => Awaitable<Output>;
```

These hooks run immediately after the PgTs generator completes, before output is merged with other generators. They receive the generator's context directly as a parameter, giving type-safe access to the PgTs-specific configuration:

```typescript
import { makePgTsGenerator } from 'kanel';
import { makeKyselyHook } from 'kanel-kysely';
import { generateZodSchemas } from 'kanel-zod';

const config = {
  generators: [
    makePgTsGenerator({
      // These hooks receive PgTsGeneratorContext as a parameter
      preRenderHooks: [
        makeKyselyHook(),
        generateZodSchemas,
        (outputAcc, pgTsContext) => {
          // Access pgTsContext.typeMap, pgTsContext.getMetadata, etc.
          return outputAcc;
        },
      ],
    }),
  ],
};
```

**Popular extension hooks like `makeKyselyHook()`, `generateZodSchemas`, and `generateKnexTablesModule` are PgTs generator-specific hooks** and must be placed in `PgTsGeneratorConfig.preRenderHooks`.

::: tip V3 to V4 Migration
In V3, all pre-render hooks received `InstantiatedConfig` as the second parameter and were configured at the top level. In V4:

- Global hooks no longer receive config as a parameter — use `useKanelContext()` instead
- PgTs-specific hooks are configured inside `makePgTsGenerator()` and receive `PgTsGeneratorContext` as a parameter

**V3 pattern (deprecated):**
```typescript
import { makeKyselyHook } from 'kanel-kysely';

module.exports = {
  preRenderHooks: [
    (outputAcc, instantiatedConfig) => {
      // Access instantiatedConfig here
      return outputAcc;
    },
    makeKyselyHook(),
  ],
};
```

**V4 pattern:**
```typescript
import { makePgTsGenerator, useKanelContext } from 'kanel';
import { makeKyselyHook } from 'kanel-kysely';

module.exports = {
  generators: [
    makePgTsGenerator({
      // PgTs-specific hooks go here
      preRenderHooks: [makeKyselyHook()],
    }),
  ],
  // Global hooks go here (optional)
  preRenderHooks: [
    (outputAcc) => {
      const context = useKanelContext(); // Access context if needed
      return outputAcc;
    },
  ],
};
```
:::

## Working with Output

The `outputAcc` (short for accumulated output) will contain the output as it looks when calling this hook. The hook should return the _entire_ output as it should appear after processing.

An `Output` instance is a record of paths (strings) and `Declaration`s. Each entry represents a file that will be written to the file system. Declarations can be either `typeDeclaration`, `interface` or `generic`. If you want to create just any code, use the last kind (`generic`) where you can just add raw string lines.

Any declaration can contain a number of comment lines and a number of type imports. Comment lines go into the property `comment`, and they will be rendered as JSDoc comments, i.e. with `/** ... */` syntax. The type imports can specify if the declaration needs to import something from another package (not necessarily only types).

To understand declarations better, look at the [ts-declaration-types.ts](../packages/kanel/src/ts-utilities/ts-declaration-types.ts) file:

<<< @/../packages/kanel/src/ts-utilities/ts-declaration-types.ts

## Execution Flow

Understanding when hooks run is important:

1. Generator 1 (PgTs) runs → produces output
2. Generator 1's `preRenderHooks` run on its output (receive `PgTsGeneratorContext`)
3. Generator 2 runs → produces output (if any)
4. Generator 2's `preRenderHooks` run on its output
5. All output is accumulated (merged)
6. **Global `preRenderHooks` run** on everything (use `useKanelContext()`)
7. Files are rendered to strings
8. `postRenderHooks` run on rendered lines

## Examples

### Example: Generate Index File (Global Hook)

```typescript
import { generateIndexFile, makePgTsGenerator } from 'kanel';

const config = {
  generators: [makePgTsGenerator()],
  // Run after all generators complete
  preRenderHooks: [generateIndexFile],
};
```

### Example: Kysely + Zod (PgTs-Specific Hooks)

```typescript
import { makePgTsGenerator } from 'kanel';
import { makeKyselyHook } from 'kanel-kysely';
import { generateZodSchemas } from 'kanel-zod';

const config = {
  generators: [
    makePgTsGenerator({
      // These transform the PgTs generator's output
      preRenderHooks: [
        makeKyselyHook(),
        generateZodSchemas,
      ],
    }),
  ],
};
```

For more examples, see the [examples folder](https://github.com/kristiandupont/kanel/tree/main/examples) in the repository.
