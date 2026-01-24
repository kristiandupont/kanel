# V4 upgrade plan

## Overview

The configuration is being rearranged to better separate concerns:
- **Core config**: Connection and general database extraction settings
- **TypescriptConfig**: General TypeScript output settings (module format, enum style) - affects all TS output
- **PgTsGeneratorConfig**: Specific configuration for transforming PostgreSQL types to TypeScript (name transformation, metadata, etc.)

The current "generators" (composite, enum, domains, etc.) are actually sub-generators that will be moved into a `PgTsGenerator` folder as implementation details. The term "Generator" is now a top-level concept.

Hooks and generators access configuration via AsyncLocalStorage context (using `useKanelContext()`) instead of having it passed as parameters.

## Backwards Compatibility Strategy

**v3 configs will continue to be supported** using a heuristic-based detection (presence/absence of `generators` field):

1. **Detection**: If config lacks `generators` field → v3 config
2. **Conversion**: v3 config is converted to v4 config internally
3. **Context**: v4 context is populated, including optional `instantiatedConfig` for v3 compatibility
4. **Hooks**: v3 hooks are wrapped to inject `instantiatedConfig` parameter from context
5. **Warning**: A deprecation warning is printed (suppressible via CLI option)

This allows v3 configs to run through v4 processing logic with minimal compatibility shims.

## Type Definitions

### V4 Config Types

```ts
// General TypeScript output configuration - affects all TypeScript generators
type TypescriptConfig = {
  enumStyle: "literal" | "enum";  // Affects type stripping vs compilation
  tsModuleFormat?: "esm" | "commonjs" | "explicit-esm" | "explicit-commonjs";
};

// A generator produces output files. Generators run sequentially.
type Generator = () => Awaitable<Output>;

// V4 hooks access context via useKanelContext() instead of parameters
type PreRenderHookV4 = (outputAcc: Output) => Awaitable<Output>;
type PostRenderHookV4 = (path: string, lines: string[]) => Awaitable<string[]>;

type ConfigV4 = {
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
  preRenderHooks?: PreRenderHookV4[];
  postRenderHooks?: PostRenderHookV4[];
};
```

### V3 Config Types (for backwards compatibility)

```ts
// V3 metadata functions receive instantiatedConfig as final parameter
type GetMetadataV3 = (details: Details, variant: Variant, instantiatedConfig: InstantiatedConfig) => Metadata;
type GetPropertyMetadataV3 = (property: Property, details: Details, instantiatedConfig: InstantiatedConfig) => PropertyMetadata;
// ... etc for other metadata functions

// V3 hooks receive instantiatedConfig
type PreRenderHookV3 = (outputAcc: Output, instantiatedConfig: InstantiatedConfig) => Awaitable<Output>;
type PostRenderHookV3 = (path: string, lines: string[], instantiatedConfig: InstantiatedConfig) => Awaitable<string[]>;

type ConfigV3 = {
  connection: string | ConnectionConfig;
  schemas?: string[];
  typeFilter?: (pgType: PgType) => boolean;

  // V3 has metadata functions at top level
  getMetadata?: GetMetadataV3;
  getPropertyMetadata?: GetPropertyMetadataV3;
  generateIdentifierType?: GenerateIdentifierTypeV3;
  getRoutineMetadata?: GetRoutineMetadataV3;
  propertySortFunction?: (a: CompositeProperty, b: CompositeProperty) => number;

  customTypeMap?: TypeMap;
  enumStyle?: "enum" | "type";
  outputPath?: string;
  preDeleteOutputFolder?: boolean;
  resolveViews?: boolean;

  preRenderHooks?: PreRenderHookV3[];
  postRenderHooks?: PostRenderHookV3[];

  // V3 does NOT have generators field
  // ... other v3 fields
};

// Union type for config detection
type Config = ConfigV3 | ConfigV4;

// Type guard
function isV3Config(config: Config): config is ConfigV3 {
  return !('generators' in config);
}
```

### V4 Metadata Types (no instantiatedConfig parameter)

```ts
type GetMetadataV4 = (details: Details, variant: Variant) => Metadata;
type GetPropertyMetadataV4 = (property: Property, details: Details) => PropertyMetadata;
// ... etc
```

## PgTsGenerator

This generator transforms PostgreSQL types into TypeScript types. The current "generators" (composite, enum, domains, ranges, routines) become internal sub-generators (implementation details) within the PgTsGenerator.

Configuration that was previously at the top level (like `getMetadata`, `customTypeMap`) is now specific to this generator.

```ts
type PgTsGeneratorConfig = {
  customTypeMap?: TypeMap;

  // V4 metadata functions (no instantiatedConfig parameter)
  getMetadata: GetMetadataV4;
  getPropertyMetadata: GetPropertyMetadataV4;
  generateIdentifierType?: GenerateIdentifierTypeV4;
  getRoutineMetadata?: GetRoutineMetadataV4;
  propertySortFunction: (a: CompositeProperty, b: CompositeProperty) => number;
};

function makePgTsGenerator(config: PgTsGeneratorConfig): Generator {
  return async () => {
    const context = useKanelContext();
    // Internal sub-generators (hardcoded): composite, enum, domains, ranges, routines
    // These are NOT exposed to users, just implementation details
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

The context now contains clearly separated concerns, with an optional backwards-compatibility field:

```ts
type KanelContext = {
  typescriptConfig: TypescriptConfig;  // tsModuleFormat derived from package.json/tsconfig if not provided
  config: Config;                      // Original config as passed to processDatabase
  schemas: Record<string, Schema>;     // Extracted database schemas

  /** @deprecated Only present when running v3 configs for backwards compatibility */
  instantiatedConfig?: InstantiatedConfig;
};
```

**Note on intersection vs union**: Using an intersection type with optional `instantiatedConfig` is simpler than a union, since AsyncLocalStorage doesn't preserve type narrowing. The optional field approach provides type safety while supporting both v3 and v4 configs.

Access via:
```ts
const context = useKanelContext();
// Context always has v4 shape, with optional instantiatedConfig for v3 compatibility
```

## V3 to V4 Conversion

When a v3 config is detected:

1. **Create v4 config structure**:
   - Extract `typescriptConfig` from top-level `enumStyle` and `tsModuleFormat`
   - Create `makePgTsGenerator()` with v3's metadata functions and `customTypeMap`
   - Wrap v3 hooks to inject `instantiatedConfig` parameter:
     ```ts
     const wrappedPreRenderHook: PreRenderHookV4 = (output) => {
       const { instantiatedConfig } = useKanelContext();
       return v3Hook(output, instantiatedConfig!);
     };
     ```
   - Prepend `applyTaggedComments` hook to `preRenderHooks` (for backwards compatibility)

2. **Create context**:
   - Populate v4 context fields (`typescriptConfig`, `config`, `schemas`)
   - Include `instantiatedConfig` for v3 hook compatibility

3. **Print deprecation warning** (unless suppressed via CLI option)

## Breaking Changes for V4

- `getMetadata`, `getPropertyMetadata`, `generateIdentifierType`, `getRoutineMetadata`, `propertySortFunction`, and `customTypeMap` move from top-level `Config` to `PgTsGeneratorConfig`
- V4 hooks and metadata functions no longer receive `instantiatedConfig` parameter - use `useKanelContext()` instead
- Pre-render hooks that modify TS output (Kysely, Zod, Knex) become generators
- `applyTaggedComments` is no longer automatically applied - users must use composable getter pattern instead (details TBD in design questions below)

## Example V4 Config

```ts
import { makePgTsGenerator, makeKyselyGenerator, makeZodGenerator } from 'kanel';

const config: ConfigV4 = {
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
      propertySortFunction: mySort,
    }),
    makeKyselyGenerator(),
    makeZodGenerator(),
  ],
};
```

## Open Design Questions

### Generator vs PreRenderHook Semantics

**Current thinking**:
- **Generators**: Produce output that gets **merged** into the final result
- **PreRenderHooks**: Can transform/remove/replace anything in the accumulated output

Both Kysely and Zod generators add/merge declarations to files, while hooks like `generateIndexFile` modify the entire output structure.

**Question**: Should generators receive accumulated output for reference?
```ts
type Generator = (outputSoFar?: Output) => Awaitable<Output>;  // Optional read access?
```
Or remain context-only:
```ts
type Generator = () => Awaitable<Output>;  // Access schemas via useKanelContext()
```

**Recommendation**: Keep generators simple (context-only). If a generator needs to read previous output, that's a smell—it should probably be a PreRenderHook instead.

### The applyTaggedComments Problem

**Context**: Type overrides currently happen in multiple places:
1. `customTypeMap` - Override by PostgreSQL type name
2. `@type` tags in DB comments - Override via `applyTaggedComments` hook (automatically applied in v3)
3. `getPropertyMetadata` - Can return `typeOverride` for individual properties

In v4, `applyTaggedComments` is no longer automatic. We need a clean migration path.

**Leading option: Composable getter pattern**
- Provide `composePropertyMetadata` utility for chaining metadata functions
- Convert `applyTaggedComments` to `taggedCommentsGetPropertyMetadata` getter
- Example:
  ```ts
  getPropertyMetadata: composePropertyMetadata(
    defaultGetPropertyMetadata,
    taggedCommentsGetPropertyMetadata,
    makeCustomTypesGetter({ 'public.users.metadata': 'JsonValue' }),
  )
  ```
- **Benefits**: No new concepts, clean composition, flexible
- **For v3→v4 conversion**: Automatically prepend wrapped `applyTaggedComments` hook to maintain compatibility

**Decision**: Evaluate ergonomics during implementation. May need refinement based on actual usage patterns.

### Code Cleanup: resolveType Complexity

**Analysis**: Complexity in `resolveType` comes from:
1. Circular reference tracking (necessary)
2. Repetitive schema lookups across tables/views/materialized views
3. Deep nesting

**Action item**: Extract schema lookup utilities (`findComposite`, `findTable`) to reduce repetition and improve readability. This is independent of v4 architecture changes.
