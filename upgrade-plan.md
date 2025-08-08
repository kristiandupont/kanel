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

### 3. Multi-Format Post-Render Hook Support

**Current v3**: Post-render hooks only process TypeScript files

**v4 Enhancement**: Post-render hooks can process multiple file formats:

```typescript
type PostRenderHook = (
  path: string,
  lines: string[],
  fileType: "typescript" | "python" | "json" | "javascript" | "yaml" | "sql",
) => Awaitable<string[]>;

// Example: Generate Python types alongside TypeScript
const pythonPostRenderHook: PostRenderHook = (path, lines, fileType) => {
  if (fileType === "typescript") {
    // Generate corresponding Python file
    const pythonPath = path.replace(".ts", ".py");
    const pythonContent = convertToPythonTypes(lines);
    // Write Python file or return modified content
  }
  return lines;
};
```

**Supported Formats**:

- TypeScript (`.ts`, `.tsx`)
- Python (`.py`)
- JSON (`.json`)
- JavaScript (`.js`, `.mjs`, `.cjs`)
- YAML (`.yml`, `.yaml`)
- SQL (`.sql`)

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
  generators: [
    { generator: typescriptGenerator, config: { source: "mainDb" } },
  ],
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

  // Legacy support (for backward compatibility)
  importsExtension?: ".ts" | ".js" | ".mjs" | ".cjs";
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
- File extensions in the project
- TypeScript configuration (`tsconfig.json`)

**Benefits**:

- Proper ESM/CommonJS compatibility
- Better bundler support (Vite, Webpack, Rollup)
- Correct Node.js module resolution
- Future-proof for modern TypeScript projects
- Maintains backward compatibility for legacy projects

**Integration with zshy**: For packages that need to support both ESM and CommonJS consumers, we'll use [zshy](https://github.com/colinhacks/zshy) as our build tool. zshy automatically handles:

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
6. **Hybrid Pipeline**: Independent generators + retained hook system for cross-generator coordination
7. **Multi-Format Output**: Support for generating multiple file formats from the same schema
8. **Explicit Configuration**: No magic comments or hidden behavior

## Target Architecture Components

### 1. Shared Source Registry

Reusable source definitions that multiple generators can reference:

```typescript
interface SourceRegistry {
  [name: string]:
    | PostgresSource
    | SwaggerSource
    | JsonSchemaSource
    | FileSource;
}

interface PostgresSource {
  type: "postgres";
  connection: string | ConnectionConfig;
}

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

### 2. Generator System (Function-Based)

```typescript
type Generator = (
  sourceData: any, // Native schema format (PG schema, Swagger spec, etc.)
  config: GeneratorConfig,
) => GeneratedOutput;

interface GeneratorConfig {
  source?: string; // Reference to shared source, or direct connection
  options?: Record<string, any>;
  customizers?: {
    getEntityMetadata?: (
      details: Details,
      defaultResult: TypeMetadata,
    ) => TypeMetadata;
    getPropertyMetadata?: (
      property: CompositeProperty,
      details: CompositeDetails,
      generateFor: "selector" | "initializer" | "mutator",
      defaultResult: PropertyMetadata,
    ) => PropertyMetadata;
    generateIdentifierType?: (
      column: TableColumn,
      details: TableDetails,
      defaultResult: TypeDeclaration,
    ) => TypeDeclaration;
  };
  typeMappings?: Record<string, string>;
  outputFormat?:
    | "typescript"
    | "python"
    | "json"
    | "javascript"
    | "yaml"
    | "sql";
}
```

**Key Principle**: Generators work directly with native schema formats (PostgreSQL schema, OpenAPI spec, etc.) without abstraction layers.

// Context accessed via AsyncLocalStorage (no prop-drilling)
interface KanelContext {
sources: SourceRegistry; // Access to all shared sources
outputPath: string;
importsExtension: string;
sharedTypeRegistry: SharedTypeRegistry;
writeFile: (path: string, content: string, format?: string) => Promise<void>;
}

const useKanelContext = () => asyncLocalStorage.getStore();

````

### 4. Enhanced Hook System

```typescript
type PreRenderHook = (outputAcc: Output) => Awaitable<Output>;
type PostRenderHook = (path: string, lines: string[], fileType: "typescript" | "python" | "json" | "javascript" | "yaml" | "sql") => Awaitable<string[]>;

// Hooks access context directly, no config parameter needed
const generateIndexFile: PreRenderHook = (outputAcc) => {
  const { sources, outputPath } = useKanelContext();
  // Generate index file logic...
};

const formatPythonFile: PostRenderHook = (path, lines, fileType) => {
  if (fileType === "python") return formatPythonCode(lines);
  return lines;
};
````

**Key Use Cases**: PreRenderHooks for cross-generator coordination, PostRenderHooks for file-level modifications and multi-format generation.

### 4. Type Customization System

Multi-level type resolution with explicit configuration:

1. Column-specific overrides (most specific)
2. Pattern-based overrides
3. Global type overrides
4. Generator-specific type maps
5. Default generator type maps

**Removed**: Comment-based overrides (v3 compatibility)

### 5. Enhanced Customization Functions

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

### 6. Cross-Generator Coordination

- **Independent Generators**: Each generator works with native schema formats
- **Shared Sources**: Multiple generators can reference same database/file
- **PreRenderHooks**: Handle cross-generator coordination (index files, knex-tables)
- **Shared Type Registry**: Coordinate branded types across generators when needed

## Target Configuration Format

```typescript
interface Config {
  // Shared source definitions
  sources?: {
    [name: string]: PostgresSource | SwaggerSource | JsonSchemaSource;
  };

  filters?: InputFilter[];

  typeCustomization?: {
    globalOverrides?: Record<string, TypeDefinition>;
    columnOverrides?: ColumnOverride[];
    // Removed: commentBasedOverrides?: boolean;
  };

  // Generators can be passed as direct function references
  generators: Array<
    | Generator
    | {
        generator: Generator;
        config: GeneratorConfig;
      }
  >;

  // Enhanced hook system with multi-format support
  preRenderHooks?: PreRenderHook[];
  postRenderHooks?: PostRenderHook[];

  output: OutputConfig;

  // New: Default enum style (defaults to "type" for unions)
  enumStyle?: "enum" | "type";

  // Modern module format configuration
  moduleFormat?: "esm" | "commonjs" | "auto";

  // Legacy support (for backward compatibility)
  importsExtension?: ".ts" | ".js" | ".mjs" | ".cjs";
}

// Example usage with shared sources and multi-format output:
const config = {
  sources: {
    mainDb: { type: "postgres", connection: "postgres://..." },
    legacyDb: { type: "postgres", connection: "postgres://legacy..." },
    apiSpec: { type: "swagger", url: "https://api.example.com/swagger.json" },
  },
  generators: [
    // Multiple generators sharing same source
    {
      generator: typescriptGenerator,
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
    },
    {
      generator: pythonGenerator,
      config: { source: "mainDb", outputFormat: "python" },
    },
    { generator: zodGenerator, config: { source: "mainDb", strictMode: true } },

    // Generator from different source
    { generator: legacyTypesGenerator, config: { source: "legacyDb" } },

    // Generator from API spec
    { generator: swaggerTypesGenerator, config: { source: "apiSpec" } },

    // Direct function with inline source
    (sourceData, config) => generateCustomTypes(sourceData, config),
  ],
  preRenderHooks: [generateIndexFile],
  postRenderHooks: [markAsGenerated, formatPythonFile],
  enumStyle: "type", // Default to unions
};
```

## Migration Strategy

### Breaking Changes Summary

1. **Postgres Comments**: `@type` tags in comments no longer work
2. **Enum Default**: Enums now default to unions instead of enum declarations
3. **Config Files**: TypeScript config files now use `npx tsx`
4. **Hook Signatures**: Post-render hooks now receive file type parameter
5. **No Backwards Compatibility**: v3 configs need migration

### Migration Tools

#### 1. Config Migration Tool

```bash
npx kanel-migrate-v3-to-v4 --config .kanelrc.js --output kanel-config.ts
```

This tool will:

- Convert v3 config to v4 format
- Remove comment-based type overrides
- Update enum style defaults
- Generate migration guide for manual changes

#### 2. Comment Migration

For users who relied on postgres comments:

```typescript
// Before (v3): Using comments
// COMMENT ON COLUMN users.status IS '@type: UserStatus';

// After (v4): Using explicit configuration
const config = {
  typeCustomization: {
    columnOverrides: [
      {
        table: "users",
        column: "status",
        typeOverride: "UserStatus",
      },
    ],
  },
};
```

#### 3. Enum Style Migration

```typescript
// Before (v3): Default enum declarations
enum UserStatus {
  active = "active",
  inactive = "inactive",
}

// After (v4): Default union types
type UserStatus = "active" | "inactive";

// Or explicitly opt into enums
const config = {
  enumStyle: "enum",
};
```

## Implementation Sketch

### Phase 1: Foundation & Breaking Changes

- [ ] Remove postgres comment parsing from `resolveType.ts`
- [ ] Update enum default from "enum" to "type" in `defaultConfig`
- [ ] Add file type support to post-render hooks
- [ ] Update binary to support TypeScript config files with `npx tsx`
- [ ] Update config file discovery to use `kanel-config.ts` naming
- [ ] Modify customization functions to include default result parameter
- [ ] Implement modern TypeScript module support (`.mts`, `.cts`, proper extensions)
- [ ] Create migration tool for v3 → v4 config conversion
- [ ] Update all type resolution to remove comment-based overrides

### Phase 2: Multi-Format Support

- [ ] Extend `PostRenderHook` type to include file type parameter
- [ ] Update `writeFile` function to support multiple formats
- [ ] Add format detection based on file extensions
- [ ] Create example generators for Python, JSON, YAML output
- [ ] Update documentation with multi-format examples

### Phase 3: Generator Ecosystem

- [ ] Create base generator interfaces and utilities
- [ ] Implement TypeScript generator (extracted from current code)
- [ ] Create Python generator example
- [ ] Create JSON schema generator example
- [ ] Update existing packages (kanel-zod, kanel-kysely) to use new generator system

### Phase 4: Testing & Documentation

- [ ] Write comprehensive tests for new architecture
- [ ] Create migration guides and examples
- [ ] Update all documentation to reflect v4 changes
- [ ] Create example projects demonstrating multi-format generation
- [ ] Performance testing and optimization

### Phase 5: Package Updates

- [ ] Update `kanel-zod` to use generator system
- [ ] Update `kanel-kysely` to use generator system
- [ ] Update `kanel-seeder` to use generator system
- [ ] Update `kanel-knex` to use pre-render hooks
- [ ] Create new packages for Python, JSON, YAML generators

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
