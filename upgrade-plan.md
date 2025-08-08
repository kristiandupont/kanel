# Kanel v4 Upgrade Plan

## Vision: From Hooks to Generators

Kanel v4 represents a fundamental shift from a "generate TypeScript types + hooks" model to a "configurable generator ecosystem" model. **This version breaks backwards compatibility to enable a clean slate and better architecture.**

### Current v3 Architecture

```
PostgreSQL Schema → TypeScript Types → Extensions (via hooks) → Zod/Kysely/etc
```

### Target v4 Architecture

```
Input Sources → Universal Schema → Generators → PreRenderHooks → PostRenderHooks → Output Files
```

## Breaking Changes & Design Decisions

### 1. Backwards Compatibility Removed

**Decision**: Kanel v4 will not maintain backwards compatibility with v3. Users will need to migrate their configurations, but this enables:

- Cleaner, more focused architecture
- Removal of legacy complexity
- Better performance and maintainability
- Support for new features without compromise

**Migration Strategy**: Provide a migration guide to help users transition from v3 to v4.

### 2. Postgres Comment Support Removed

**Current v3 Feature**: Postgres comments with `@type` tags could override type generation:

```sql
-- v3: This comment would override the type
COMMENT ON COLUMN users.status IS '@type: UserStatus';
```

**v4 Decision**: Remove built-in postgres comment parsing. Users can achieve this with:

- Custom `getPropertyMetadata` functions
- Post-render hooks for file-level modifications
- Generator-specific customization options

**Rationale**:

- Reduces complexity in core type resolution
- Encourages explicit configuration over magic comments
- Enables better tooling and IDE support
- Aligns with the generator-based architecture

### 3. Support for Multiple File Formats

**Current v3**: Pre-render hooks take an accumulated output consisting of abstract typescript code.

**V4 Enhancement**: Pre-render hooks take an accumulated output consisting of various file formats.

```typescript
type PreRenderHook = (outputAcc: Output) => Awaitable<Output>;

export type Path = string;
export type TypescriptFileContents = {
  filetype: "typescript";
  declarations: TypescriptDeclaration[]; // The "Declaration" type, now
};

export type GenericFileContents = {
  filetype: "generic";
  extension: string;
  content: string;
};

// ..future other formats.

type FileContents = TypescriptFileContents | GenericFileContents;

type Output = Record<Path, FileContents>;
```

**Current v3**: Post-render hooks only process TypeScript files

**v4 Enhancement**: Post-render hooks can process multiple file formats:

```typescript
type PostRenderHook = (
  path: string, // Now incluudes extension
  lines: string[],
) => Awaitable<string[]>;
```

### 4. Enums Default to Unions

**Current v3**: Enums default to TypeScript enum declarations

**v4 Decision**: Enums default to string union types

```typescript
// v3 default (enumStyle: "enum")
enum UserStatus {
  active = "active",
  inactive = "inactive",
  pending = "pending",
}

// v4 default (enumStyle: "type")
type UserStatus = "active" | "inactive" | "pending";
```

**Rationale**:

- Better tree-shaking and bundle optimization
- More idiomatic modern TypeScript
- Easier serialization/deserialization
- Better compatibility with JSON schemas

**Migration**: Users can still opt into enum declarations with `enumStyle: "enum"`.

### 5. TypeScript Config File Support

**Current v3**: Only supports JavaScript config files (`.js`, `.cjs`)

**v4 Enhancement**: Native TypeScript config support using `npx tsx`

```typescript
// kanel-config.ts - Full TypeScript support
import type { Config } from "kanel";

const config: Config = {
  sources: {
    mainDb: { type: "postgres", connection: "postgres://..." },
  },
  generators: [makePgTsGenerator({ source: "mainDb" })],
};

export default config;
```

**Implementation**: Update the binary to use `npx tsx` for TypeScript config files:

```bash
#!/usr/bin/env node
# Updated binary entry point
if (process.argv[2]?.endsWith('.ts')) {
  require('tsx/cli');
} else {
  require('../build/cli');
}
```

**Config File Discovery**: The system will look for config files in this order:

1. `kanel-config.ts` (TypeScript)
2. `kanel-config.js` (JavaScript)
3. `kanel-config.cjs` (CommonJS)
4. `kanel-config.json` (JSON)

### 6. Modern TypeScript Module Support

**Current v3 Problem**: Generates `.ts` files with extensionless imports, which is outdated:

```typescript
// v3: Generated file with extensionless imports
import { User } from "./User"; // ❌ Outdated approach
import { Post } from "./Post";
```

**v4 Enhancement**: Support modern TypeScript module formats with proper extensions:

```typescript
// v4: Modern module support with proper extensions
import { User } from "./User.js"; // ✅ ESM with .js extension
import { Post } from "./Post.mjs"; // ✅ ESM with .mjs extension
import { Comment } from "./Comment.cjs"; // ✅ CommonJS with .cjs extension
```

**Supported Module Formats**:

1. **ESM Modules** (`.mts`, `.mjs`):

   ```typescript
   // Generated as .mts files
   import { User } from "./User.js";
   export type { User };
   ```

2. **CommonJS Modules** (`.cts`, `.cjs`):

   ```typescript
   // Generated as .cts files
   import { User } from "./User.cjs";
   export type { User };
   ```

3. **Traditional TypeScript** (`.ts`, `.js`):
   ```typescript
   // Generated as .ts files with configurable import extensions
   import { User } from "./User.js"; // or .ts, .mjs, .cjs based on config
   ```

**Configuration Options**:

```typescript
interface Config {
  // ... other config options

  // Module format configuration
  moduleFormat?: "esm" | "commonjs" | "auto";
}
```

**Module Format Mapping**:

| `moduleFormat`          | Output Extension | Import Extension | Use Case                   |
| ----------------------- | ---------------- | ---------------- | -------------------------- |
| `"esm"`                 | `.mts`           | `.js`            | Modern ESM projects        |
| `"commonjs"`            | `.cts`           | `.cjs`           | Traditional Node.js        |
| `"auto"`                | `.ts`            | `.js`            | Auto-detected from project |
| `"auto"` (ESM detected) | `.mts`           | `.js`            | Auto-detected ESM          |
| `"auto"` (CJS detected) | `.cts`           | `.cjs`           | Auto-detected CommonJS     |

**Auto-Detection**: The system can auto-detect module format based on:

- `package.json` `"type": "module"` field
- TypeScript configuration (`tsconfig.json`)

**Integration with zshy**: In order tosupport both ESM and CommonJS consumers, we'll use [zshy](https://github.com/colinhacks/zshy) as our build tool. zshy automatically handles:

- Dual-package builds (ESM + CommonJS) from a single TypeScript codebase
- Proper import/export extension rewriting
- Auto-generation of `package.json` exports maps
- Declaration file generation (`.d.cts` for maximum compatibility)
- "Masquerading as CJS" pattern to avoid ESM/CommonJS interop issues

This means Kanel can focus on generating clean TypeScript code, while zshy handles the complex module format transformations and package.json management.

## Key Design Principles

1. **Generator-Agnostic Foundation**: Core system knows nothing about specific generators
2. **Function-Based Architecture**: No OOP - composition over inheritance using functions and configuration
3. **Direct Function References**: JavaScript config allows passing generators as functions, not strings
4. **Context-Based Architecture**: AsyncLocalStorage eliminates prop-drilling of configuration
5. **Direct Schema Access**: Generators work with native schema formats (no abstraction layer)
6. **Hybrid Pipeline**: Independent generators + hook system for cross-generator coordination
7. **Multi-Format Output**: Support for generating multiple file formats from the same schema

## Target Architecture Components

### 1. Shared Source Registry

Reusable source definitions that multiple generators can reference:

```typescript
interface SourceRegistry {
  [name: string]: PostgresSource;
  // | SwaggerSource
  // | JsonSchemaSource
  // | FileSource;
}

interface PostgresSource {
  type: "postgres";
  connection: string | ConnectionConfig;
}

// Possible future sources:

interface SwaggerSource {
  type: "swagger";
  url?: string;
  path?: string;
}

interface JsonSchemaSource {
  type: "json-schema";
  path: string;
}
```

Those are the ones specified in the config. Once Kanel is running, it will create an `InstantiatedSourceRegistry` from the `SourceRegistry`. In this, a postgres source will contain a connection to the database, and a schema, and similar for the other sources.

### 2. Generator System (Function-Based)

```typescript
type Generator = () => Awaitable<Output>;
```

**Key Principle**: Generators are pretty much identical to post render hooks, but they do not take an output as a parameter, and instead of overriding the output, the outputs from generators will be combined into one before passed into the pre-render hook pipeline.

```typescript
// Context accessed via AsyncLocalStorage (no prop-drilling)
interface KanelContext {
  config: Config;
  instantiatedSources: InstantiatedSourceRegistry;
}

const useKanelContext = () => asyncLocalStorage.getStore();
```

### 4. Enhanced Hook System

```typescript
type PreRenderHook = (outputAcc: Output) => Awaitable<Output>;
type PostRenderHook = (path: string, lines: string[]) => Awaitable<string[]>;

// Hooks access context directly, no config parameter needed
const generateIndexFile: PreRenderHook = (outputAcc) => {
  const { sources, outputPath } = useKanelContext();
  // Generate index file logic...
};

const prettier: PostRenderHook = async (path, lines) => {
  const formatted = await prettier.format(lines, { parser: "typescript" });
  return formatted.split("\n");
};
```

**Key Use Cases**: PreRenderHooks for cross-generator coordination, PostRenderHooks for file-level modifications and multi-format generation.

### 4. Enhanced Customization Functions

**v3 Problem**: Users had to manually call default implementations
**v4 Solution**: Default result is always provided as a parameter

```typescript
// v4: Default result is always available
const getEntityMetadata = (details, defaultResult) => ({
  ...defaultResult,
  comment: [...(defaultResult.comment || []), "Custom comment"],
});

const getPropertyMetadata = (
  property,
  details,
  generateFor,
  defaultResult,
) => ({
  ...defaultResult,
  comment: [...(defaultResult.comment || []), `Generated for: ${generateFor}`],
});
```

**Benefits**: No manual default implementation calls, always available default result, cleaner customization.

## Target Configuration Format

```typescript
interface Config {
  // Shared source definitions
  sources?: {
    [name: string]: PostgresSource | SwaggerSource | JsonSchemaSource;
  };

  // Generators can be passed as direct function references
  generators: Generator[];

  // Hooks
  preRenderHooks?: PreRenderHook[];
  postRenderHooks?: PostRenderHook[];

  // Modern module format configuration
  moduleFormat?: "esm" | "commonjs" | "auto";
}

// Example usage with shared sources and multi-format output:
const config = {
  sources: {
    mainDb: { type: "postgres", connection: "postgres://..." },
  },
  generators: [
    makePgTsGenerator({
      config: {
        source: "mainDb",
        customizers: {
          getEntityMetadata: (details, defaultResult) => ({
            ...defaultResult,
            comment: [...(defaultResult.comment || []), "Custom comment added"],
          }),
          getPropertyMetadata: (
            property,
            details,
            generateFor,
            defaultResult,
          ) => ({
            ...defaultResult,
            comment: [
              ...(defaultResult.comment || []),
              `Generated for: ${generateFor}`,
            ],
          }),
        },
      },
    }),
  ],
  preRenderHooks: [generateIndexFile],
  postRenderHooks: [markAsGenerated, formatPythonFile],
};
```

## Implementation Plan

Based on the current codebase analysis, here's a concrete implementation plan:

### High-Level Steps

1. **Foundation & Breaking Changes** - Remove v3 compatibility, update core types
2. **New Architecture Implementation** - Implement generator system and context
3. **Multi-Format Support** - Extend output system for multiple file types
4. **Package Ecosystem Migration** - Convert existing packages to new system
5. **Testing & Documentation** - Comprehensive testing and migration guides

### Phase 1: Foundation & Breaking Changes (Detailed)

#### ✅ 1.1 Update Config Types and CLI

- **File**: `packages/kanel/src/config-types.ts`
  - ✅ Add new `Config` interface with `sources`, `generators`, `moduleFormat`
  - ✅ Remove v3-specific fields (`connection`, `customTypeMap`, etc.)
  - ✅ Update `InstantiatedConfig` to include `instantiatedSources`
- **File**: `packages/kanel/src/cli/main.ts`
  - ✅ Update config file discovery to use `kanel-config.ts` naming
  - ✅ Add TypeScript config support with `npx tsx`
  - ✅ Update config validation for new structure

#### ✅ 1.2 Remove Postgres Comment Support

- **File**: `packages/kanel/src/generators/resolveType.ts`
  - ✅ Remove `resolveTypeFromComment` function (lines 15-49)
  - ✅ Remove `tryParse` import from `tagged-comment-parser`
  - ✅ Update `resolveType` function to remove comment-based type resolution
- **File**: `packages/kanel/src/generators/makeCompositeGenerator.ts`
  - ✅ Remove comment parsing logic (lines 18-24)
  - ✅ Remove `tryParse` import

#### ✅ 1.3 Update Enum Defaults

- **File**: `packages/kanel/src/processDatabase.ts`
  - ✅ Change `enumStyle: "enum"` to `enumStyle: "type"` in `defaultConfig` (line 33)
- **File**: `packages/kanel/src/generators/makeEnumsGenerator.ts`
  - ✅ Update default behavior to generate unions instead of enums

#### ✅ 1.4 Update Customization Functions

- **File**: `packages/kanel/src/metadata-types.ts`

  - ✅ Update function signatures to include default result parameter:

    ```typescript
    // Before
    getMetadata: (
      details: Details,
      generateFor: string,
      config: InstantiatedConfig,
    ) => TypeMetadata;

    // After
    getMetadata: (details: Details, defaultResult: TypeMetadata) =>
      TypeMetadata;
    ```

  - ✅ Update all customization function types similarly

- **File**: `packages/kanel/src/default-metadata-generators.ts`
  - ✅ Refactor to provide default implementations that can be called by the system
  - ✅ Update all functions to work with new signatures

#### ✅ 1.5 Create New Output System

- **File**: `packages/kanel/src/Output.ts` (completely rewrite)

  ```typescript
  export type Path = string;

  export type TypescriptFileContents = {
    filetype: "typescript";
    declarations: TypescriptDeclaration[];
  };

  export type GenericFileContents = {
    filetype: "generic";
    extension: string;
    content: string;
  };

  type FileContents = TypescriptFileContents | GenericFileContents;
  type Output = Record<Path, FileContents>;
  ```

#### ✅ 1.6 Create Context System

- **New File**: `packages/kanel/src/context.ts`

  ```typescript
  import { AsyncLocalStorage } from "async_hooks";

  interface KanelContext {
    config: Config;
    instantiatedSources: InstantiatedSourceRegistry;
  }

  const asyncLocalStorage = new AsyncLocalStorage<KanelContext>();

  export const useKanelContext = () => {
    const context = asyncLocalStorage.getStore();
    if (!context) throw new Error("Kanel context not available");
    return context;
  };

  export const runWithContext = async <T>(
    context: KanelContext,
    fn: () => Promise<T>,
  ): Promise<T> => {
    return asyncLocalStorage.run(context, fn);
  };
  ```

#### ✅ 1.7 Create Source Registry System

- **New File**: `packages/kanel/src/sources/index.ts`

  ```typescript
  interface PostgresSource {
    type: "postgres";
    connection: string | ConnectionConfig;
  }

  interface InstantiatedPostgresSource {
    type: "postgres";
    connection: string | ConnectionConfig;
    schemas: Record<string, Schema>;
  }

  export type SourceRegistry = Record<string, PostgresSource>;
  export type InstantiatedSourceRegistry = Record<
    string,
    InstantiatedPostgresSource
  >;

  export const instantiateSources = async (
    sources: SourceRegistry,
  ): Promise<InstantiatedSourceRegistry> => {
    // Implementation to connect to databases and extract schemas
  };
  ```

#### ✅ 1.8 Create Base Generator Interface

- **New File**: `packages/kanel/src/generators/base.ts`

  ```typescript
  import type Output from "../Output";

  export type Generator = () => Promise<Output>;

  export const makePgTsGenerator = (config: {
    source: string;
    customizers?: {
      getEntityMetadata?: (
        details: Details,
        defaultResult: TypeMetadata,
      ) => TypeMetadata;
      getPropertyMetadata?: (
        property: CompositeProperty,
        details: CompositeDetails,
        generateFor: string,
        defaultResult: PropertyMetadata,
      ) => PropertyMetadata;
      generateIdentifierType?: (
        column: TableColumn,
        details: TableDetails,
        defaultResult: TypeDeclaration,
      ) => TypeDeclaration;
    };
  }): Generator => {
    // Implementation that extracts current TypeScript generation logic
  };
  ```

#### ✅ 1.9 Update Main Processing Function

- **File**: `packages/kanel/src/processDatabase.ts` (rename to `processConfig.ts`)

  - ✅ Completely rewrite to use new architecture:

    ```typescript
    const processConfig = async (config: Config): Promise<void> => {
      const instantiatedSources = await instantiateSources(config.sources);
      const context: KanelContext = { config, instantiatedSources };

      return runWithContext(context, async () => {
        // Run generators
        const outputs = await Promise.all(
          config.generators.map((generator) => generator()),
        );

        // Combine outputs
        let combinedOutput: Output = {};
        outputs.forEach((output) => {
          combinedOutput = { ...combinedOutput, ...output };
        });

        // Run pre-render hooks
        for (const hook of config.preRenderHooks ?? []) {
          combinedOutput = await hook(combinedOutput);
        }

        // Render and write files
        // ... implementation
      });
    };
    ```

#### ✅ 1.10 Update Hook System

- **File**: `packages/kanel/src/config-types.ts`
  - ✅ Update hook signatures to remove `instantiatedConfig` parameter:
    ```typescript
    export type PreRenderHook = (outputAcc: Output) => Awaitable<Output>;
    export type PostRenderHook = (
      path: string,
      lines: string[],
    ) => Awaitable<string[]>;
    ```
- **File**: `packages/kanel/src/hooks/markAsGenerated.ts`
  - ✅ Update to new signature without `instantiatedConfig`

#### ✅ 1.11 Create Migration Tool

- **New File**: `packages/kanel/src/migration/v3-to-v4.ts`
  - ✅ Function to convert v3 config to v4 format
  - ✅ Extract customization functions and wrap them
  - ✅ Generate migration guide with manual steps needed

### Success Criteria for Phase 1

- ✅ All v3 configs can be migrated to v4 format
- ✅ Postgres comment parsing is completely removed
- ✅ Enums default to unions
- ✅ Customization functions work with default result parameter
- ⚠️ New generator system can produce same output as v3 (partially complete - base interface created)
- ✅ TypeScript config files work with `npx tsx`
- ⚠️ All tests pass with new architecture (needs testing)

## Architecture Considerations & Tradeoffs

### Decision: Source-Specific Generators vs Universal Generators

#### What We Chose

**Source-specific generators** that work with native schema formats (Postgres schema, Swagger spec, etc.) rather than a universal abstraction layer.

#### What We Lose

##### **Cross-Source Generator Reuse**

```typescript
// This approach won't work:
const zodGenerator = (sourceData, config) => {
  if (sourceData.isPostgres) {
    /* generate from PG schema */
  }
  if (sourceData.isSwagger) {
    /* generate from OpenAPI spec */
  }
};

// Instead we need separate generators:
const postgresZodGenerator = (pgSchema, config) => {
  /* PG-specific */
};
const swaggerZodGenerator = (swaggerSpec, config) => {
  /* OpenAPI-specific */
};
```

##### **Generator Proliferation**

We go from conceptually simple generators:

- `typescriptGenerator`
- `zodGenerator`
- `kyselyGenerator`

To source-specific variants:

- `postgresTypescriptGenerator`, `swaggerTypescriptGenerator`
- `postgresZodGenerator`, `swaggerZodGenerator`
- `postgresKyselyGenerator` (Swagger Kysely doesn't make sense)

#### What We Gain

##### **Clean, Specialist Implementations**

```typescript
// Postgres Zod generator can leverage full Postgres richness
const postgresZodGenerator = (pgSchema, config) => {
  return pgSchema.tables.map((table) => {
    // Access Postgres-specific: constraints, indexes, functions, arrays, etc.
    const constraints = table.constraints;
    const pgArrayTypes = table.columns.filter((c) => c.pgType.includes("[]"));
    const domains = table.columns.filter((c) => c.domainName);

    return generateZodSchema(table, constraints, pgArrayTypes, domains);
  });
};

// Swagger Zod generator can handle OpenAPI-specific features
const swaggerZodGenerator = (swaggerSpec, config) => {
  return swaggerSpec.components.schemas.map((schema) => {
    // Access OpenAPI-specific: discriminators, oneOf, allOf, etc.
    const discriminator = schema.discriminator;
    const polymorphicTypes = schema.oneOf;
    const inheritance = schema.allOf;

    return generateZodSchemaFromOpenAPI(
      schema,
      discriminator,
      polymorphicTypes,
    );
  });
};
```

##### **Package Ecosystem Strategy**

Rather than forcing everything into core, we can build focused ecosystems:

**Core Postgres Ecosystem:**

- `kanel` (core + postgres typescript generator)
- `@kanel/postgres-zod`
- `@kanel/postgres-kysely`
- `@kanel/postgres-seeder`
- `@kanel/postgres-python`

**Swagger Ecosystem:**

- `@kanel/swagger-typescript`
- `@kanel/swagger-zod`
- `@kanel/swagger-client`

**Future Ecosystems:**

- `@kanel/json-schema-typescript`
- `@kanel/protobuf-typescript`
- `@kanel/graphql-typescript`

##### **Technical Benefits**

1. **No Leaky Abstractions**: Each generator uses the full power of its source format
2. **Optimized Dependencies**: Postgres generators use `extract-pg-schema`, Swagger ones use OpenAPI parsers
3. **Independent Evolution**: Swagger support evolves without affecting Postgres users
4. **Smaller Bundles**: Users install only what they need
5. **Clear Mental Models**: "I want Zod from Postgres" → `@kanel/postgres-zod`

#### The "Zod Shame" - Why Universal Generators Are Hard

While Zod conceptually _could_ work across sources, the implementation details make abstraction impractical:

- **Postgres `jsonb`** → `z.record(z.unknown())` or custom schema based on pg comments
- **Swagger `object`** → `z.object({ ... })` from OpenAPI property definitions
- **Array handling**: Postgres native arrays vs OpenAPI array schemas work very differently
- **Validation**: Postgres constraints vs OpenAPI validation keywords have different semantics
- **Type relationships**: Postgres foreign keys vs OpenAPI `$ref` relationships are fundamentally different

Any abstraction would either:

1. **Lose important nuances** from each source type, or
2. **Become leaky** with source-specific conditionals everywhere

#### Alternative Considered: Shared Utilities

We considered composition helpers for common patterns:

```typescript
import { createZodPrimitive, createZodObject } from "@kanel/zod-helpers";

// Shared by postgres-zod and swagger-zod
const postgresZodGenerator = (pgSchema, config) => {
  return tables.map((table) => createZodObject(table, createZodPrimitive));
};
```

**Decision**: Clean separation outweighs code sharing benefits. The implementation details are too different to meaningfully share.

#### Conclusion

**We chose specialist generators over universal ones** because:

1. **Postgres and Swagger are fundamentally different** - forcing abstraction loses their unique strengths
2. **Package ecosystem** allows focused, optimized implementations
3. **User clarity** - clear mapping from "source type + output type" to package
4. **Future extensibility** - easy to add new source types without complex abstraction changes

The tradeoff is more packages and some conceptual duplication, but we gain cleaner implementations and preserve the full power of each source format.

---

_This plan embraces breaking changes to create a cleaner, more powerful, and more maintainable architecture for Kanel's next evolution into a true multi-source, multi-target type generation platform._
