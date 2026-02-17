# V4 Architecture Plan

## Status: Beta Readiness Assessment

The core V4 architecture is fully implemented. This document serves as both the architecture reference and the beta release checklist.

---

## Architecture Overview

The configuration is arranged to better separate concerns:

- **Core config**: Connection and general database extraction settings
- **TypescriptConfig**: General TypeScript output settings (module format, enum style) - affects all TS output
- **PgTsGeneratorConfig**: Specific configuration for transforming PostgreSQL types to TypeScript (name transformation, metadata, etc.)

Hooks and generators access configuration via AsyncLocalStorage context (using `useKanelContext()` or `usePgTsGeneratorContext()`) instead of having it passed as parameters.

---

## Beta Release Checklist

### 1. Type Naming Cleanup — Remove *V4 suffixes from public API

Currently the V4 public types carry a `V4` suffix which will be confusing as V3 fades out. These should be renamed:

| Current Name | Should Become | Notes |
|---|---|---|
| `PreRenderHookV4` | `PreRenderHook` | V3's `PreRenderHookV3` stays as-is (deprecated) |
| `PostRenderHookV4` | `PostRenderHook` | V3's `PostRenderHookV3` stays as-is (deprecated) |
| `TypeMetadataV4` | `TypeMetadata` | Old `TypeMetadata` in metadata-types.ts gets renamed to `TypeMetadataV3` (deprecated) |
| `PropertyMetadataV4` | `PropertyMetadata` | Same treatment |
| `RoutineMetadataV4` | `RoutineMetadata` | Same treatment |
| `GetMetadataV4` | `GetMetadata` | Old V3 `GetMetadata` renamed to `GetMetadataV3` (deprecated) |
| `GetPropertyMetadataV4` | `GetPropertyMetadata` | Same |
| `GenerateIdentifierTypeV4` | `GenerateIdentifierType` | Same |
| `GetRoutineMetadataV4` | `GetRoutineMetadata` | Same |
| `ConfigV4` | `Config` | Old union `Config` becomes `AnyConfig`, or just deprecated |

**Note**: `ConfigV3` / `ConfigV4` may need to stay as-is as union members since the union `Config = ConfigV3 | ConfigV4` is structural. Evaluate carefully.

### 2. Make TypescriptConfig Optional (with defaults)

`typescriptConfig` is currently required on `ConfigV4`. It should have a sensible default so a minimal config just works:

```ts
// Should work:
const config: Config = {
  connection: "...",
  generators: [makePgTsGenerator()],
};
```

Default `TypescriptConfig`:
```ts
const defaultTypescriptConfig: TypescriptConfig = {
  enumStyle: "literal-union",
  // tsModuleFormat: derived from package.json/tsconfig if not provided
};
```

This also resolves the current `renderTsFile` issue — `renderTsFile` reads `instantiatedConfig.importsExtension` from context via a cast hack. The proper fix is:
1. Make `TypescriptConfig` optional on `ConfigV4`
2. In `processV4Config`, use the derived `importsExtension` from `deriveExtensions()` and store it on `typescriptConfig` (or in a separate derived context field)
3. Update `renderTsFile` to read from `typescriptConfig` directly, removing the `instantiatedConfig` dependency

### 3. Fix Deep Imports in kanel-kysely and kanel-zod

Both packages import from internal build paths instead of the public API:

**kanel-kysely:**
- `import { useKanelContext } from "kanel/build/context"` → `from "kanel"`
- `import { usePgTsGeneratorContext } from "kanel/build/generators/pgTsGeneratorContext"` → `from "kanel"`

**kanel-zod:**
- `import type { PreRenderHookV4 } from "kanel/build/config-types-v4"` → `from "kanel"`
- `import { useKanelContext } from "kanel/build/context"` → `from "kanel"`
- `import { usePgTsGeneratorContext } from "kanel/build/generators/pgTsGeneratorContext"` → `from "kanel"`
- `import type { CompositeDetails } from "kanel/build/generators/composite-types"` → `from "kanel"`

All these symbols are already exported from the public `kanel` index.

### 4. Fix zodCamelCaseHook throwing on non-TS files

`zodCamelCaseHook` currently throws if any non-typescript file is in the output:
```ts
throw new Error(`Path ${path} is not a typescript file`);
```

This will break if used alongside `makeMarkdownGenerator`. Should skip non-typescript files instead.

### 5. Update Documentation

All documentation is V3-era and needs V4 updates:

- `docs-src/getting-started.md` — show V4 config format
- `docs-src/configuring.md` — V4 config API (generators, typescriptConfig, etc.)
- `docs-src/preRenderHooks.md` — V4 hook signature, placement in `PgTsGeneratorConfig.preRenderHooks` vs global
- `docs-src/postRenderHooks.md` — V4 hook signature
- `docs-src/getMetadata.md` — V4 composable pattern with `builtinMetadata`
- `docs-src/getPropertyMetadata.md` — same
- `docs-src/generateIdentifierType.md` — same
- `docs-src/getRoutineMetadata.md` — same
- `docs-src/migration.md` — add V3→V4 migration guide (currently only covers V2→V3)
- Package READMEs (kanel-kysely, kanel-zod, kanel-knex, kanel-enum-tables) — show V4 usage

**Important**: The deprecation warning in `config-conversion.ts` points to `https://kristiandupont.github.io/kanel/v4-migration`. This page must exist before beta.

### 6. Remove/Clean stale comment in processDatabase.ts

Lines 194–195 contain:
```
* Note: Full V4 implementation (with makePgTsGenerator) will be in Phase 4.
* For now, this runs the old V3-style generators but uses V4 hooks.
```
This is now false — the full V4 implementation is complete. Remove.

### 7. applyTaggedComments and markAsGenerated hook types

`applyTaggedComments` and `markAsGenerated` are exported as `PreRenderHookV3` / `PostRenderHookV3`. V4 users cannot use them directly in a V4 config's `preRenderHooks`/`postRenderHooks` without wrapping. Options:
- Upgrade them to V4 signatures (they can use `useKanelContext()` for any config they need)
- Or at minimum, clearly document that they require wrapping in V4 configs

`markAsGenerated` in particular is commonly used — users will expect to be able to add it to V4 post-render hooks.

---

## Backwards Compatibility Strategy

**V3 configs continue to be supported** using heuristic detection (presence/absence of `generators` field):

1. **Detection**: If config lacks `generators` field → v3 config
2. **Conversion**: V3 config is converted to V4 config internally via `convertV3ConfigToV4()`
3. **Context**: V4 context is populated, including `instantiatedConfig` for V3 compatibility
4. **Hooks**: V3 hooks are wrapped to inject `instantiatedConfig` from context
5. **Defaults**: V3-specific defaults are applied (`enumStyle: "enum"`, `markAsGenerated` postRenderHook, `applyTaggedComments` preRenderHook)
6. **Warning**: A deprecation warning is printed (suppressible via `--no-deprecation-warning` CLI option)

---

## Type Definitions

### V4 Config Types (current, with planned renames noted)

```ts
// General TypeScript output configuration - affects all TypeScript generators
type TypescriptConfig = {
  enumStyle: "literal-union" | "enum";
  tsModuleFormat?: "esm" | "commonjs" | "explicit-esm" | "explicit-commonjs";
  importsExtension?: string; // Legacy; use tsModuleFormat instead
};

// A generator produces output files. Generators run sequentially.
type Generator = () => Awaitable<Output>;

// V4 hooks - access context via useKanelContext() instead of parameters
// (Currently exported as PreRenderHookV4 / PostRenderHookV4 — to be renamed)
type PreRenderHook = (outputAcc: Output) => Awaitable<Output>;
type PostRenderHook = (path: string, lines: string[]) => Awaitable<string[]>;

type Config = {
  connection: string | ConnectionConfig;
  schemaNames?: string[];
  filter?: (pgType: PgType) => boolean;
  resolveViews?: boolean;

  typescriptConfig?: TypescriptConfig; // Optional — has defaults (currently required, fix pending)

  outputPath?: string;
  preDeleteOutputFolder?: boolean;

  generators: Generator[];
  preRenderHooks?: PreRenderHook[];
  postRenderHooks?: PostRenderHook[];
};
```

### V3 Config Types (for backwards compatibility)

V3 types retain the `V3` suffix or are deprecated:
```ts
type PreRenderHookV3 = (outputAcc: Output, instantiatedConfig: InstantiatedConfig) => Awaitable<Output>;
type PostRenderHookV3 = (path: string, lines: string[], instantiatedConfig: InstantiatedConfig) => Awaitable<string[]>;
// ... etc
```

### V4 Metadata Types (composable with builtins)

V4 metadata functions receive the builtin metadata as their last parameter:

```ts
// (Currently exported as GetMetadataV4 — to be renamed to GetMetadata)
type GetMetadata = (
  details: Details,
  variant: "selector" | "initializer" | "mutator" | undefined,
  builtinMetadata: TypeMetadata,
) => TypeMetadata;

type GetPropertyMetadata = (
  property: CompositeProperty,
  details: CompositeDetails,
  variant: "selector" | "initializer" | "mutator",
  builtinMetadata: PropertyMetadata,
) => PropertyMetadata;

type GenerateIdentifierType = (
  column: TableColumn | ForeignTableColumn,
  details: TableDetails | ForeignTableDetails,
  builtinType: TypeDeclaration,
) => TypeDeclaration;

type GetRoutineMetadata = (
  routineDetails: RoutineDetails,
  builtinMetadata: RoutineMetadata,
) => RoutineMetadata;
```

**Note on "builtin" vs "default":**
- The third parameter is the **builtin** implementation (Kanel's internal implementation)
- It's NOT a "default" from user config - user config is optional
- The old `defaultGetMetadata` functions are deprecated and internal-only
- Users should use the `builtinMetadata` parameter instead of importing default functions

---

## PgTsGenerator

This generator transforms PostgreSQL types into TypeScript types. The previous top-level generators (composite, enum, domains, ranges, routines) are internal sub-generators within `PgTsGenerator`.

```ts
type PgTsGeneratorConfig = {
  customTypeMap?: TypeMap;

  getMetadata?: GetMetadata;         // (formerly GetMetadataV4)
  getPropertyMetadata?: GetPropertyMetadata;
  generateIdentifierType?: GenerateIdentifierType;
  getRoutineMetadata?: GetRoutineMetadata;
  propertySortFunction?: (a: CompositeProperty, b: CompositeProperty) => number;

  filter?: (pgType: PgType) => boolean;

  // Pre-render hooks running within PgTsGenerator context — can call usePgTsGeneratorContext()
  preRenderHooks?: PreRenderHook[];
};

function makePgTsGenerator(config?: PgTsGeneratorConfig): Generator;
```

### PgTsGenerator Context

Available inside PgTsGenerator execution (generators and their `preRenderHooks`):

```ts
type PgTsGeneratorContext = {
  typeMap: TypeMap;
  getMetadata: (details: Details, variant: "selector" | "initializer" | "mutator" | undefined) => TypeMetadata;
  getPropertyMetadata: (property: CompositeProperty, details: CompositeDetails, variant: ...) => PropertyMetadata;
  generateIdentifierType?: (column, details) => TypeDeclaration;
  getRoutineMetadata?: (routineDetails: RoutineDetails) => RoutineMetadata;
  propertySortFunction: (a: CompositeProperty, b: CompositeProperty) => number;
};

const context = usePgTsGeneratorContext(); // throws outside PgTsGenerator execution
```

---

## Other Generators

These exist as pre-render hooks specific to the PgTsGenerator context (must be placed in `PgTsGeneratorConfig.preRenderHooks`):

- **kanel-knex** (`generateKnexTablesModule`, `generateMigrationCheck`): Creates Knex type definitions
- **kanel-enum-tables** (`enumTablesPreRenderHook`): Creates enum types from tagged tables
- **kanel-kysely** (`makeKyselyHook`, `kyselyCamelCaseHook`): Creates Kysely database interface types
- **kanel-zod** (`generateZodSchemas`, `makeGenerateZodSchemas`, `zodCamelCaseHook`): Creates Zod schemas

All of the above are fully upgraded to V4 and use `usePgTsGeneratorContext()` / `useKanelContext()`.

New standalone generator:
- **MarkdownGenerator** (`makeMarkdownGenerator`): Generates human/LLM-friendly markdown docs

---

## Context

```ts
type KanelContext = {
  typescriptConfig: TypescriptConfig;
  config: Config;
  schemas: Record<string, Schema>;

  /** @deprecated Only present when running v3 configs for backwards compatibility */
  instantiatedConfig?: InstantiatedConfig;
};

const context = useKanelContext(); // throws outside processDatabase execution
```

---

## V3 to V4 Conversion (internal)

When a V3 config is detected:

1. **Apply V3 defaults**: `enumStyle: "enum"`, `postRenderHooks: [markAsGenerated]`, etc.
2. **Extract schemas** early (needed to build `instantiatedConfig`)
3. **Build `instantiatedConfig`** — V3 compatibility object
4. **Wrap V3 pre-render hooks** → become `PgTsGeneratorConfig.preRenderHooks`
5. **Prepend `applyTaggedComments`** as first PgTs pre-render hook
6. **Wrap V3 post-render hooks** (default: `markAsGenerated`)
7. **Wrap V3 metadata functions** to match V4 signature
8. **Create `ConfigV4`** with `makePgTsGenerator(wrappedConfig)`
9. **Print deprecation warning**

---

## Breaking Changes for V4

- `getMetadata`, `getPropertyMetadata`, `generateIdentifierType`, `getRoutineMetadata`, `propertySortFunction`, `customTypeMap` move from top-level `Config` to `PgTsGeneratorConfig`
- `typeFilter` renamed to `filter` (both at global and generator level)
- V4 hooks no longer receive `instantiatedConfig` parameter — use `useKanelContext()` instead
- V4 metadata functions receive a `builtinMetadata`/`builtinType` parameter as their last argument
- `defaultGetMetadata`, `defaultGetPropertyMetadata`, `defaultGenerateIdentifierType`, `defaultGetRoutineMetadata` are **deprecated**
- Pre-render hooks that need `usePgTsGeneratorContext()` must be placed in `PgTsGeneratorConfig.preRenderHooks`
- `applyTaggedComments` is no longer automatically applied in V4 configs
- `markAsGenerated` is no longer a default post-render hook in V4 configs

---

## Example V4 Config

```ts
import {
  makePgTsGenerator,
  markAsGenerated,
  generateIndexFile,
} from "kanel";
import { makeKyselyHook } from "kanel-kysely";
import { generateZodSchemas } from "kanel-zod";
import { generateKnexTablesModule } from "kanel-knex";

const config = {
  connection: { /* pg connection */ },
  typescriptConfig: {
    enumStyle: "literal-union",
    tsModuleFormat: "esm",
  },
  outputPath: "./models",
  generators: [
    makePgTsGenerator({
      getMetadata: (details, generateFor, builtinMetadata) => ({
        ...builtinMetadata,
        comment: ["My custom comment"],
      }),
      customTypeMap: { /* ... */ },
      // Hooks that need PgTs context go here:
      preRenderHooks: [
        makeKyselyHook(),
        generateZodSchemas,
        generateKnexTablesModule,
      ],
    }),
  ],
  postRenderHooks: [markAsGenerated],
};
```

---

## V4 Default Changes

| Setting           | V3 Default          | V4 Default        | Rationale                                              |
| ----------------- | ------------------- | ----------------- | ------------------------------------------------------ |
| `enumStyle`       | `"enum"`            | `"literal-union"` | Literal types are more modern and avoid TS compilation |
| `postRenderHooks` | `[markAsGenerated]` | `[]`              | Explicit opt-in for V4, less magic                     |
| `typescriptConfig`| N/A (top-level)     | `{ enumStyle: "literal-union" }` | Optional with defaults |

---

## Implementation Decisions

### Terminology: "builtin" vs "default"

**Decision**: V4 metadata functions receive `builtinMetadata` (not `defaultMetadata`) as their last parameter.

- **"builtin"** = Kanel's internal implementation (the base layer)
- **"default"** = What the user configuration defaults to (which is `undefined` in V4 — no function provided)
- The V3 `defaultGetMetadata` functions were confusingly named — they're not "defaults" but "builtins"

**Migration Example**:

```ts
// V3 pattern (deprecated):
import { defaultGetMetadata } from "kanel";
getMetadata: (details, generateFor, instantiatedConfig) => {
  const defaults = defaultGetMetadata(details, generateFor, instantiatedConfig);
  return { ...defaults, comment: ["Custom"] };
};

// V4 pattern:
getMetadata: (details, generateFor, builtinMetadata) => ({
  ...builtinMetadata,
  comment: ["Custom"],
});
```

### Generator vs PreRenderHook Semantics

**Generators**: Produce output by reading schemas from context. Run sequentially.

**Generator-specific PreRenderHooks** (in `PgTsGeneratorConfig.preRenderHooks`):
- Transform the output of that specific generator
- Run within that generator's execution context — can call `usePgTsGeneratorContext()`
- Run immediately after their generator, before output is merged

**Global PreRenderHooks** (in `Config.preRenderHooks`):
- Run after all generators complete, on the accumulated output
- Can only use `useKanelContext()` (no generator-specific context available)

**Execution flow**:
1. Generator 1 runs → produces output
2. Generator 1's `preRenderHooks` run on its output
3. Generator 2 runs → produces output
4. Generator 2's `preRenderHooks` run on its output
5. All output is accumulated (merged)
6. Global `preRenderHooks` run on everything
7. Files are rendered (TS/markdown/generic)
8. `postRenderHooks` run on rendered lines

### The applyTaggedComments pattern

**V3**: `applyTaggedComments` was automatically prepended as a pre-render hook.

**V4 plan (TBD)**: Provide a composable getter pattern:

```ts
getPropertyMetadata: composePropertyMetadata(
  taggedCommentsGetPropertyMetadata,
  makeCustomTypesGetter({ "public.users.metadata": "JsonValue" }),
);
```

This converts the hook approach to a composable getter approach. Exact API TBD during implementation.

**Current V3 compat**: `applyTaggedComments` is automatically prepended (wrapped) when converting V3 → V4.
