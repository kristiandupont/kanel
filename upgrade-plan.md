# Kanel v4 Upgrade Plan

## Vision: From Hooks to Generators

Kanel v4 represents a fundamental shift from a "generate TypeScript types + hooks" model to a "configurable generator ecosystem" model.

### Current v3 Architecture

```
PostgreSQL Schema → TypeScript Types → Extensions (via hooks) → Zod/Kysely/etc
```

### Target v4 Architecture

```
Input Sources → Universal Schema → Generators → PreRenderHooks → PostRenderHooks → Output Files
```

## Key Design Principles

1. **Generator-Agnostic Foundation**: Core system knows nothing about specific generators
2. **Function-Based Architecture**: No OOP - composition over inheritance using functions and configuration
3. **Direct Function References**: JavaScript config allows passing generators as functions, not strings
4. **Context-Based Architecture**: AsyncLocalStorage eliminates prop-drilling of configuration
5. **Direct Schema Access**: Generators work with native schema formats (no abstraction layer)
6. **Hybrid Pipeline**: Independent generators + retained hook system for cross-generator coordination
7. **Preserved Customization**: All current customization power retained and enhanced

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

### 2. Direct Schema Access

Generators work directly with their native schema formats:

- TypeScript generator works with raw PostgreSQL schema
- Swagger generator works with OpenAPI spec
- No abstraction layer to lose nuanced information

### 3. Generator System (Function-Based)

```typescript
type Generator = (
  sourceData: any, // Native schema format (PG schema, Swagger spec, etc.)
  config: GeneratorConfig,
) => GeneratedOutput;

interface GeneratorConfig {
  source?: string; // Reference to shared source, or direct connection
  options?: Record<string, any>;
  customizers?: {
    getEntityMetadata?: Function;
    getPropertyMetadata?: Function;
    generateIdentifierType?: Function;
  };
  typeMappings?: Record<string, string>;
}

// Context accessed via AsyncLocalStorage (no prop-drilling)
interface KanelContext {
  sources: SourceRegistry; // Access to all shared sources
  outputPath: string;
  importsExtension: string;
  sharedTypeRegistry: SharedTypeRegistry;
  writeFile: (path: string, content: string) => Promise<void>;
}

const useKanelContext = () => asyncLocalStorage.getStore();
```

### 4. Hook System (Retained from v3, Simplified)

```typescript
type PreRenderHook = (
  outputAcc: Output, // Combined output from all generators
) => Awaitable<Output>;

type PostRenderHook = (
  path: string,
  lines: string[], // Rendered file content
) => Awaitable<string[]>;

// Hooks access context directly, no config parameter needed
const generateIndexFile: PreRenderHook = (outputAcc) => {
  const { sources, outputPath, importsExtension } = useKanelContext();
  // Can access any source for metadata
  // Generate index file logic...
};
```

**Key Use Cases:**

- **PreRenderHooks**: Index file generation, cross-generator coordination (knex-tables)
- **PostRenderHooks**: File-level modifications (mark as generated, formatting)

### 5. Source Sharing & Access

```typescript
// Example: Multiple generators sharing sources
const typescriptGenerator: Generator = async (sourceData, config) => {
  const { sources } = useKanelContext();

  let schema;
  if (typeof config.source === "string") {
    // Reference shared source
    schema = await sources[config.source].getSchema();
  } else {
    // Direct source (backward compatibility)
    schema = await extractPgSchema(config.source);
  }

  return generateTypescriptFromPgSchema(schema, config);
};

// Hooks can access any source
const generateCombinedIndex: PreRenderHook = async (outputAcc) => {
  const { sources } = useKanelContext();
  const pgSchema = await sources.mainDb.getSchema();
  const swaggerSpec = await sources.apiSpec.getSpec();
  // Generate cross-source index
};
```

### 6. Type Customization System

Multi-level type resolution with preserved customization power:

1. Column-specific overrides (most specific)
2. Comment-based overrides (v3 compatibility)
3. Pattern-based overrides
4. Global type overrides
5. Generator-specific type maps
6. Default generator type maps

### 7. Cross-Generator Coordination

- **Independent Generators**: Each generator works with native schema formats
- **Shared Sources**: Multiple generators can reference same database/file
- **PreRenderHooks**: Handle cross-generator coordination (index files, knex-tables)
- **Shared Type Registry**: Coordinate branded types across generators when needed

## Target Configuration Format

```typescript
interface KanelV4Config {
  // Shared source definitions
  sources?: {
    [name: string]: PostgresSource | SwaggerSource | JsonSchemaSource;
  };

  filters?: InputFilter[];

  typeCustomization?: {
    globalOverrides?: Record<string, TypeDefinition>;
    columnOverrides?: ColumnOverride[];
    commentBasedOverrides?: boolean;
  };

  // Generators can be passed as direct function references
  generators: Array<
    | Generator
    | {
        generator: Generator;
        config: GeneratorConfig;
      }
  >;

  // Simplified hook system (no config parameter needed)
  preRenderHooks?: PreRenderHook[];
  postRenderHooks?: PostRenderHook[];

  output: OutputConfig;
}

// Example usage with shared sources:
const config = {
  sources: {
    mainDb: { type: "postgres", connection: "postgres://..." },
    legacyDb: { type: "postgres", connection: "postgres://legacy..." },
    apiSpec: { type: "swagger", url: "https://api.example.com/swagger.json" },
  },
  generators: [
    // Multiple generators sharing same source
    { generator: typescriptGenerator, config: { source: "mainDb" } },
    { generator: zodGenerator, config: { source: "mainDb", strictMode: true } },

    // Generator from different source
    { generator: legacyTypesGenerator, config: { source: "legacyDb" } },

    // Generator from API spec
    { generator: swaggerTypesGenerator, config: { source: "apiSpec" } },

    // Direct function with inline source (backward compatibility)
    (sourceData, config) => generateCustomTypes(sourceData, config),
  ],
  preRenderHooks: [generateIndexFile],
  postRenderHooks: [markAsGenerated],
};
```

## Migration Strategy

### Backward Compatibility Strategy

#### Seamless v3 → v4 Migration

```typescript
// v3 config (continues to work unchanged)
const v3Config = {
  connection: "...",
  getMetadata: customGetMetadata,
  generateIdentifierType: customGenerator,
  preRenderHooks: [generateIndexFile],
  postRenderHooks: [markAsGenerated],
  // ... other v3 options
};

// v4 automatically transforms to:
const v4Config = {
  sources: {
    defaultDb: { type: "postgres", connection: "..." },
  },
  generators: [
    {
      generator: typescriptGenerator,
      config: {
        source: "defaultDb",
        customizers: {
          getMetadata: customGetMetadata,
          generateIdentifierType: customGenerator,
        },
        // ... other extracted typescript options
      },
    },
  ],
  preRenderHooks: [generateIndexFile], // Unchanged
  postRenderHooks: [markAsGenerated], // Unchanged
};
```

#### Automatic Detection & Migration

- **Missing `generators` property**: Auto-create TypeScript generator with extracted config
- **Deprecation warnings**: Inform users of new format while maintaining compatibility
- **Hook preservation**: All existing preRenderHooks and postRenderHooks work unchanged (context accessed via AsyncLocalStorage)
- **No prop-drilling**: Eliminate instantiatedConfig parameter passing throughout the system

#### Extension Migration

- `kanel-zod` hooks → `zod` generator
- `kanel-kysely` hooks → `kysely` generator
- `kanel-seeder` hooks → `seeder` generator
- `kanel-knex` hooks → remain as preRenderHooks (cross-generator coordination)

### Migration Path for Users

1. **Zero changes required**: v3 configs work unchanged with deprecation warnings
2. **Gradual adoption**: Users can incrementally adopt new generator format
3. **Enhanced power**: Access to new multi-generator and multi-input capabilities
4. **Preserved customization**: All existing customization functions continue working

## Implementation Sketch

### Phase 1: Prep. Write tests for v3 to ensure that it continues to work as expected

- [ ] Create test utilites for postgres testing.
- [ ] Rename processDatabase to processConfig
- [ ] Write tests of processConfig which uses test containers to provide a postgres database and mocks writeFile
- [ ] Write a couple of tests that cover a configuration with various getMetadata, getPropertyMetadata and generateIdentifierType instances
- [ ] Write a few tests that cover other options

### Phase 2: Foundation Refactor

- [ ] Create types for the new architecture (SourceRegistry, Generator, GeneratorConfig, etc.)
- [ ] Split the config type into V3Config and V4Config, with Config being the union of the two
- [ ] Mark the `connection` property as deprecated in V3Config
- [ ] Implement a function that detects the config version (based on the presence of the `generators` property)
- [ ] Create the context "system" which will be used to pass the config and other information to the generators
- [ ] Implement a function that transforms a V3Config into a V4Config
- [ ] Make sure v3 config customization functions are wrapped to get an "instantiatedConfig" parameter built from the context
- [ ] Turn the parts of processConfig that create typescript types into a generator
- [ ] Split the existing processConfig into the new generator and "general purpose" processing (which will be the same for all generators)

### Phase 3: Kanel-Zod Migration

- [ ] Write some tests for the kanel-zod package

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

_This plan prioritizes backward compatibility while enabling the flexibility needed for Kanel's next evolution into a true multi-source, multi-target type generation platform._
