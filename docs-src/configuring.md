# Configuring

Kanel v4 is a **generator framework** that connects to PostgreSQL and runs generators to produce output. Understanding this architecture is key to configuring Kanel effectively.

## Configuration Structure

```javascript
module.exports = {
  // Core Kanel configuration (applies to all generators)
  connection: /* ... */,
  schemaNames: /* ... */,
  generators: [/* ... */],

  // TypeScript configuration (applies to TypeScript generators)
  typescriptConfig: { /* ... */ },

  // Global hooks (run after all generators)
  preRenderHooks: [/* ... */],
  postRenderHooks: [/* ... */],
};
```

## Example Configurations

Here are example V4 configurations from the [examples](https://github.com/kristiandupont/kanel/tree/main/examples) directory:

**Simple Kysely setup:**
<<< @/../examples/kysely/kanel.config.js

**Advanced TypeScript + Zod with custom metadata:**
<<< @/../examples/ts-plus-zod/kanel.config.js

**Markdown documentation only:**
<<< @/../examples/markdown/kanel.config.js

---

# Core Kanel Configuration

These options apply regardless of which generators you use.

## connection (required)

The only required property. Specifies how to connect to your PostgreSQL database.

Follows the [`client`](https://node-postgres.com/apis/client) constructor in [pg](https://www.npmjs.com/package/pg).

```javascript
// Object format
connection: {
  host: 'localhost',
  user: 'postgres',
  password: 'postgres',
  database: 'acme',
}

// String format
connection: 'postgresql://postgres:postgres@localhost:5432/acme'

// PGlite (embedded Postgres)
connection: 'file:./my-pglite-db'
```

If the connection string starts with `"file:"`, the specified path is opened using [PGlite](https://github.com/electric-sql/pglite).

## generators (required)

Array of generator functions that produce output. Each generator runs sequentially.

```javascript
const { makePgTsGenerator, makeMarkdownGenerator } = require('kanel');

generators: [
  makePgTsGenerator(),      // Generate TypeScript types
  makeMarkdownGenerator(),  // Generate documentation
]
```

Available built-in generators:
- **`makePgTsGenerator()`** - PostgreSQL → TypeScript types (most common)
- **`makeMarkdownGenerator()`** - PostgreSQL → Markdown documentation

You can also write custom generators for other languages or formats.

## schemaNames

Array of schema names to process. If omitted, all non-system schemas are processed.

```javascript
schemaNames: ['public', 'auth', 'api']
```

## filter

Filter which PostgreSQL types to extract from the database (applies before generators run):

```javascript
filter: (pgType) => !pgType.name.startsWith('_'),  // Exclude underscore-prefixed types
```

Note: Individual generators can have their own `filter` option (e.g., `PgTsGeneratorConfig.filter`) to further filter which types they process.

## resolveViews

Attempt to provide better types for views by parsing view definition SQL:

```javascript
resolveViews: true
```

This helps determine:
- Proper identifier types for foreign key columns
- Accurate nullability based on source columns

Postgres doesn't provide this information by default for views, so Kanel infers it by parsing SQL. This is non-trivial and can fail in some cases, so use with caution.

## outputPath

Root directory for generated files. Defaults to current directory.

```javascript
outputPath: './src/models'
```

How files are organized within `outputPath` depends on the generator. The default `PgTsGenerator` places files in `${outputPath}/${schemaName}/${typeName}.ts`.

## preDeleteOutputFolder

Delete all contents of `outputPath` before generating. **Recommended** to ensure no stale files remain.

```javascript
preDeleteOutputFolder: true
```

::: warning
Don't put manually written code in your output folder if you enable this option!
:::

---

# TypeScript Configuration

The `typescriptConfig` section applies to **any TypeScript generator** (primarily `PgTsGenerator`, but also custom TS generators if you write them).

```javascript
typescriptConfig: {
  enumStyle: 'literal-union',
  tsModuleFormat: 'esm',
}
```

## enumStyle

How PostgreSQL enums are generated:

- **`'literal-union'`** (V4 default): `type Fruit = "apples" | "oranges" | "bananas"`
- **`'enum'`** (V3 default): `enum Fruit { apples = "apples", ... }`

Literal unions are more modern and don't require TypeScript compilation, but enums can be more convenient in some cases.

## tsModuleFormat

Module format for TypeScript output files:

- **`'commonjs'`** (default): `.ts` extension, no extension on imports
- **`'esm'`**: `.ts` extension, `.js` extension on imports
- **`'explicit-esm'`**: `.mts` extension, `.mjs` extension on imports
- **`'explicit-commonjs'`**: `.cts` extension, `.cjs` extension on imports

## importsExtension (deprecated)

**Deprecated**: Use `tsModuleFormat` instead.

---

# Global Hooks

Global hooks run after all generators complete and operate on the accumulated output.

## preRenderHooks

Hooks that transform the accumulated `Output` before rendering to files:

```javascript
const { generateIndexFile } = require('kanel');

preRenderHooks: [
  generateIndexFile,  // Creates an index.ts that exports everything
]
```

See [preRenderHooks](./preRenderHooks.md) for details.

## postRenderHooks

Hooks that modify rendered file contents just before writing to disk:

```javascript
const { markAsGenerated } = require('kanel');

postRenderHooks: [
  markAsGenerated,  // Adds @generated comment to files
]
```

See [postRenderHooks](./postRenderHooks.md) for details.

---

# PgTsGenerator Configuration

The `PgTsGenerator` is the primary generator that transforms PostgreSQL schemas into TypeScript types. Its configuration goes **inside `makePgTsGenerator()`**, not at the top level.

```javascript
const { makePgTsGenerator } = require('kanel');

generators: [
  makePgTsGenerator({
    // All these options are PgTsGenerator-specific
    customTypeMap: { /* ... */ },
    getMetadata: (details, generateFor, builtinMetadata) => { /* ... */ },
    // ... etc
  }),
]
```

## Why Separate PgTsGenerator Config?

Because Kanel is a generator framework, not all generators need the same configuration. For example:

- `customTypeMap` only makes sense for PostgreSQL → TypeScript conversion
- `getMetadata` is specific to how TypeScript types are named and organized
- A Python generator would have completely different configuration options

This separation keeps the architecture clean and allows for other generators to exist alongside `PgTsGenerator`.

## customTypeMap

Map PostgreSQL types to TypeScript types. Keys must be schema-qualified (e.g., `pg_catalog.float8` for built-in types):

```javascript
makePgTsGenerator({
  customTypeMap: {
    'pg_catalog.float8': 'number',
    'pg_catalog.tsvector': 'string',
    'pg_catalog.bytea': {
      name: 'bytea',
      typeImports: [{
        name: 'bytea',
        path: 'postgres-bytea',
        isAbsolute: true,
        isDefault: true,
        importAsType: true,
      }],
    },
  },
})
```

## Metadata Functions

These functions control how PostgreSQL types are transformed into TypeScript. They're specific to `PgTsGenerator` because they deal with TypeScript-specific concerns (naming, file paths, branded types, etc.).

Each function receives Kanel's builtin implementation as a parameter, making them composable:

### getMetadata

Customize type metadata (name, path, comments):

```javascript
makePgTsGenerator({
  getMetadata: (details, generateFor, builtinMetadata) => ({
    ...builtinMetadata,
    comment: ['My custom comment'],
  }),
})
```

See [getMetadata](./getMetadata.md) for full details.

### getPropertyMetadata

Customize property/column metadata:

```javascript
makePgTsGenerator({
  getPropertyMetadata: (property, details, generateFor, builtinMetadata) => ({
    ...builtinMetadata,
    comment: [`Database type: ${property.expandedType}`],
  }),
})
```

See [getPropertyMetadata](./getPropertyMetadata.md) for full details.

### generateIdentifierType

Customize how branded ID types are generated:

```javascript
makePgTsGenerator({
  generateIdentifierType: (column, details, builtinType) => ({
    ...builtinType,
    comment: ['Custom ID type'],
  }),
})
```

See [generateIdentifierType](./generateIdentifierType.md) for full details.

### getRoutineMetadata

Customize metadata for database functions/procedures:

```javascript
makePgTsGenerator({
  getRoutineMetadata: (routineDetails, builtinMetadata) => ({
    ...builtinMetadata,
    returnTypeComment: ['Custom return type docs'],
  }),
})
```

See [getRoutineMetadata](./getRoutineMetadata.md) for full details.

## propertySortFunction

Customize how properties are sorted in generated interfaces:

```javascript
makePgTsGenerator({
  propertySortFunction: (a, b) => a.name.localeCompare(b.name),
})
```

Default behavior: primary keys first, then database ordinal position.

## filter

Filter which PostgreSQL types this specific generator processes:

```javascript
makePgTsGenerator({
  filter: (pgType) => pgType.schemaName === 'public',
})
```

This is distinct from the top-level `filter` option. The execution order is:
1. Top-level `filter` - Controls what's extracted from the database
2. Generator `filter` - Controls what each generator processes

## preRenderHooks

Pre-render hooks specific to `PgTsGenerator`. These receive `PgTsGeneratorContext` as a parameter and run immediately after the generator produces output.

**This is where extension hooks like Kysely, Zod, and Knex go:**

```javascript
const { makeKyselyHook } = require('kanel-kysely');
const { generateZodSchemas } = require('kanel-zod');

makePgTsGenerator({
  preRenderHooks: [
    makeKyselyHook(),
    generateZodSchemas,
  ],
})
```

See [preRenderHooks](./preRenderHooks.md) for the difference between PgTs-specific and global hooks.

---

# Complete Example

```javascript
const { makePgTsGenerator, markAsGenerated } = require('kanel');
const { makeKyselyHook, kyselyTypeFilter } = require('kanel-kysely');
const { generateZodSchemas } = require('kanel-zod');

/** @type {import('kanel').Config} */
module.exports = {
  // Core Kanel config
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: 'postgres',
    database: 'mydb',
  },
  outputPath: './src/models',
  preDeleteOutputFolder: true,
  resolveViews: true,
  filter: kyselyTypeFilter,

  // TypeScript config (applies to all TS generators)
  typescriptConfig: {
    enumStyle: 'literal-union',
    tsModuleFormat: 'esm',
  },

  // Generators
  generators: [
    makePgTsGenerator({
      // PgTsGenerator-specific config
      customTypeMap: {
        'pg_catalog.tsvector': 'string',
        'pg_catalog.bpchar': 'string',
      },
      // PgTs-specific hooks (receive PgTsGeneratorContext)
      preRenderHooks: [
        makeKyselyHook(),
        generateZodSchemas,
      ],
    }),
  ],

  // Global hooks (run after all generators)
  postRenderHooks: [markAsGenerated],
};
```

---

## Migrating from V3

The update to version 4 introduced several breaking changes. If you are migrating from V3, check out the [migration guide](./migration.md) for help.

V3 configs continue to work with a deprecation warning, but it's recommended to migrate to V4 for better type safety and flexibility.

For more examples, see the [examples directory](https://github.com/kristiandupont/kanel/tree/main/examples).
