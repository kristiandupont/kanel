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
5. **Defaults**: v3-specific defaults are applied (e.g., `enumStyle: "enum"`, `markAsGenerated` postRenderHook)
6. **Warning**: A deprecation warning is printed (suppressible via CLI option)

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
  filter?: (pgType: PgType) => boolean;  // Global filter applied during database extraction
  resolveViews?: boolean;

  // General TypeScript settings (affects all TS generators)
  typescriptConfig: TypescriptConfig;

  // Output settings
  outputPath?: string;
  preDeleteOutputFolder?: boolean;

  // Top-level generators and hooks
  generators: Generator[];
  preRenderHooks?: PreRenderHookV4[];  // Global hooks (run after all generators)
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

### V4 Metadata Types (composable with builtins)

V4 metadata functions receive the builtin metadata as their last parameter, enabling easy composition:

```ts
type GetMetadataV4 = (details: Details, variant: Variant, builtinMetadata: Metadata) => Metadata;
type GetPropertyMetadataV4 = (property: Property, details: Details, builtinMetadata: PropertyMetadata) => PropertyMetadata;
type GenerateIdentifierTypeV4 = (column: Column, details: Details, builtinType: TypeDeclaration) => TypeDeclaration;
type GetRoutineMetadataV4 = (routineDetails: RoutineDetails, builtinMetadata: RoutineMetadata) => RoutineMetadata;

// Example usage - just override what you need:
getMetadata: (details, variant, builtinMetadata) => ({
  ...builtinMetadata,
  comment: ['My custom comment'],
})
```

**Note on "builtin" vs "default":**
- The third parameter is the **builtin** implementation (Kanel's internal implementation)
- It's NOT a "default" from user config - user config is optional
- The old `defaultGetMetadata` functions are deprecated and internal-only
- Users should use the `builtinMetadata` parameter instead of importing default functions

## PgTsGenerator

This generator transforms PostgreSQL types into TypeScript types. The current "generators" (composite, enum, domains, ranges, routines) become internal sub-generators (implementation details) within the PgTsGenerator.

Configuration that was previously at the top level (like `getMetadata`, `customTypeMap`) is now specific to this generator.

```ts
type PgTsGeneratorConfig = {
  customTypeMap?: TypeMap;

  // V4 metadata functions (composable with builtins)
  // All optional - if not provided, builtin implementations are used
  getMetadata?: GetMetadataV4;
  getPropertyMetadata?: GetPropertyMetadataV4;
  generateIdentifierType?: GenerateIdentifierTypeV4;
  getRoutineMetadata?: GetRoutineMetadataV4;
  propertySortFunction?: (a: CompositeProperty, b: CompositeProperty) => number;

  // Generator-specific filter - further filters types already extracted from database
  filter?: (pgType: PgType) => boolean;

  // Generator-specific pre-render hooks - run within generator context
  preRenderHooks?: PreRenderHookV4[];
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

1. **Apply v3 defaults**:
   - `enumStyle: "enum"` (v3 default; v4 default will be `"literal"`)
   - `postRenderHooks: [markAsGenerated]` (if not explicitly set)
   - Other v3 defaults from current `defaultConfig`

2. **Create v4 config structure**:
   - Extract `typescriptConfig` from top-level `enumStyle` and `tsModuleFormat`
   - Create `makePgTsGenerator()` with v3's metadata functions and `customTypeMap`
   - **Move v3 pre-render hooks to PgTsGenerator-specific hooks**:
     - V3 pre-render hooks operated on PgTs output and used PgTs context
     - In V4, these become `preRenderHooks` in `PgTsGeneratorConfig`
     - This allows them to run within the PgTsGenerator context
   - Wrap v3 hooks to inject `instantiatedConfig` parameter:
     ```ts
     const wrappedPreRenderHook: PreRenderHookV4 = (output) => {
       const { instantiatedConfig } = useKanelContext();
       return v3Hook(output, instantiatedConfig!);
     };
     ```
   - Prepend `applyTaggedComments` hook to PgTsGenerator `preRenderHooks` (for backwards compatibility)

3. **Create context**:
   - Populate v4 context fields (`typescriptConfig`, `config`, `schemas`)
   - Include `instantiatedConfig` for v3 hook compatibility

4. **Print deprecation warning** (unless suppressed via CLI option)

## Breaking Changes for V4

- `getMetadata`, `getPropertyMetadata`, `generateIdentifierType`, `getRoutineMetadata`, `propertySortFunction`, and `customTypeMap` move from top-level `Config` to `PgTsGeneratorConfig`
- `typeFilter` renamed to `filter` (both at global and generator level)
- V4 hooks no longer receive `instantiatedConfig` parameter - use `useKanelContext()` instead
- V4 metadata functions receive a `builtinMetadata`/`builtinType` parameter as their last argument (for composition)
- `defaultGetMetadata`, `defaultGetPropertyMetadata`, `defaultGenerateIdentifierType`, and `defaultGetRoutineMetadata` are **deprecated** and will be removed in a future version
  - These were V3's "default" implementations that users could import and call
  - In V4, use the `builtinMetadata` parameter passed to your custom functions instead
  - They remain exported for V3 compatibility only (marked with `@deprecated`)
  - **Migration:** Instead of importing and calling `defaultGetMetadata(...)`, use the third parameter: `(details, generateFor, builtinMetadata) => ({ ...builtinMetadata, ... })`
- Pre-render hooks that modify TS output (Kysely, Zod, Knex) become generators
- `applyTaggedComments` is no longer automatically applied - users must use composable getter pattern instead (details TBD in design questions below)
- **Pre-render hooks are now generator-specific**:
  - Global `preRenderHooks` run after all generators complete
  - Generator-specific `preRenderHooks` (e.g., in `PgTsGeneratorConfig`) run within that generator's context
  - This allows hooks to access generator-specific context like `usePgTsGeneratorContext()`

## Example V4 Config

```ts
import { makePgTsGenerator, makeKyselyGenerator, makeZodGenerator } from 'kanel';

const config: ConfigV4 = {
  connection: { /* ... */ },
  filter: (type) => type.schemaName === 'public',  // Global filter at extraction level
  typescriptConfig: {
    enumStyle: 'literal',  // v4 default (v3 was 'enum')
    tsModuleFormat: 'esm',
  },
  outputPath: './models',
  generators: [
    makePgTsGenerator({
      // Composable metadata functions - receive builtins as last parameter
      getMetadata: (details, generateFor, builtinMetadata) => ({
        ...builtinMetadata,
        comment: ['My custom comment'],
      }),
      getPropertyMetadata: (property, details, generateFor, builtinMetadata) => ({
        ...builtinMetadata,
        comment: [...(builtinMetadata.comment || []), 'Extra info'],
      }),
      customTypeMap: { /* ... */ },
      // Generator-specific filter - further filters within this generator
      filter: (type) => !type.name.startsWith('_'),
      // Generator-specific pre-render hooks - run within PgTsGenerator context
      preRenderHooks: [makeZodSchemaHook()],  // Can access usePgTsGeneratorContext()
    }),
    makeKyselyGenerator(),
  ],
  // Global pre-render hooks run after all generators (optional)
  preRenderHooks: [addTimestampToAllFiles],
  // Note: markAsGenerated is NOT added by default in v4
  // Add explicitly if needed: postRenderHooks: [markAsGenerated]
};
```

## V4 Default Changes

| Setting | V3 Default | V4 Default | Rationale |
|---------|------------|------------|-----------|
| `enumStyle` | `"enum"` | `"literal"` | Literal types are more modern and avoid TS compilation |
| `postRenderHooks` | `[markAsGenerated]` | `[]` | Explicit opt-in for v4, less magic |

## Implementation Decisions

### Terminology: "builtin" vs "default"

**Decision**: V4 metadata functions receive `builtinMetadata` (not `defaultMetadata`) as their third parameter.

**Rationale**:
- **"builtin"** = Kanel's internal implementation (the base layer)
- **"default"** = What the user configuration defaults to (which is `undefined` in V4)
- The V3 `defaultGetMetadata` functions were confusingly named - they're not "defaults" but "builtins"
- In V4, if user doesn't provide `getMetadata`, the builtin is used directly
- If user does provide `getMetadata`, they receive the builtin result to compose on

**V3 Compatibility**:
- `defaultGetMetadata`, `defaultGetPropertyMetadata`, etc. remain exported
- Marked with `@deprecated` JSDoc
- Will be removed in a future version
- Users should migrate to using the `builtinMetadata` parameter

**Migration Example**:
```ts
// V3 pattern (deprecated):
import { defaultGetMetadata } from 'kanel';
getMetadata: (details, generateFor, instantiatedConfig) => {
  const defaults = defaultGetMetadata(details, generateFor, instantiatedConfig);
  return { ...defaults, comment: ['Custom'] };
}

// V4 pattern (recommended):
getMetadata: (details, generateFor, builtinMetadata) => {
  return { ...builtinMetadata, comment: ['Custom'] };
}
```

### Generator vs PreRenderHook Semantics

**Decision**: Keep generators simple and context-only:
```ts
type Generator = () => Awaitable<Output>;  // Access schemas via useKanelContext()
```

**Rationale**:
- **Generators**: Produce output that gets merged into the final result. Access database schemas via context.
- **Generator-specific PreRenderHooks**: Transform the output of a specific generator, running within that generator's execution context
  - Example: Zod schema generation hooks run within PgTsGenerator context, can call `usePgTsGeneratorContext()`
  - Run immediately after their generator produces output, before output is merged
- **Global PreRenderHooks**: Transform/remove/replace anything in accumulated output from all generators
  - Receive `outputAcc` parameter with all generator output
  - Run after all generators complete

**Execution flow**:
1. Generator 1 produces output
2. Generator 1's pre-render hooks transform its output
3. Generator 2 produces output
4. Generator 2's pre-render hooks transform its output
5. All output is accumulated
6. Global pre-render hooks run on everything

If a generator needs to see previous generators' output, it should be a global PreRenderHook instead.

### The applyTaggedComments Migration

**Decision**: For v4, provide composable getter pattern (to be implemented later).

**v3 compatibility**: In v3→v4 conversion, automatically prepend the existing `applyTaggedComments` hook (wrapped) to `preRenderHooks` to maintain backwards compatibility.

**Future v4 pattern** (TBD during implementation):
```ts
getPropertyMetadata: composePropertyMetadata(
  defaultGetPropertyMetadata,
  taggedCommentsGetPropertyMetadata,
  makeCustomTypesGetter({ 'public.users.metadata': 'JsonValue' }),
)
```

This converts the hook approach to a composable getter approach. Exact API to be refined during implementation.
