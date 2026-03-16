# Getting Started

If you have a Postgres server running locally with a database called, say, `acme`, you can run Kanel by simply typing:

```bash
$ npx kanel -d postgresql://localhost:5432/acme -o ./src/models
```

This will create a folder called `src/models` and generate a TypeScript file for each table in the database.
This is a quick way to try things out and see what Kanel can do with your database.

For real projects, you'll want to install Kanel as a devDependency:

```bash
$ npm i -D kanel
```

## Understanding Generators

Kanel v4 is built around a **generator architecture**. A generator is a function that inspects your database and produces output files. Think of Kanel as a framework that:

1. Connects to your PostgreSQL database
2. Extracts schema information (tables, views, enums, functions, etc.)
3. Runs one or more **generators** that transform that schema into various outputs

The most common generator is **PgTsGenerator**, which generates TypeScript types. But you could also use:

- **MarkdownGenerator** - Generate documentation
- **Custom generators** - Write your own to generate Python, Rust, GraphQL schemas, or anything else

This architecture makes Kanel flexible: you can generate multiple outputs from one database schema, or even write generators for non-TypeScript languages.

## Creating a Configuration File

Create a configuration file named `kanel.config.js` (or `.kanelrc.js` for V3 compatibility). Here's a minimal V4 configuration:

```javascript
const { makePgTsGenerator } = require('kanel');

/** @type {import('kanel').Config} */
module.exports = {
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: 'postgres',
    database: 'acme',
  },

  outputPath: './src/models',
  preDeleteOutputFolder: true,

  // The generators array is where you specify what to generate
  generators: [
    makePgTsGenerator(),  // Generate TypeScript types
  ],
};
```

### Configuration Breakdown

- **connection** - Database connection info (required)
- **outputPath** - Where to write generated files
- **preDeleteOutputFolder** - Clean the output folder before generating (recommended)
- **generators** - Array of generator functions to run

The `generators` array is the heart of the config. Each generator runs in sequence and produces output.

## PgTsGenerator Configuration

Since most people use Kanel for TypeScript generation, let's look at `PgTsGenerator` options:

```javascript
const { makePgTsGenerator } = require('kanel');

module.exports = {
  connection: /* ... */,
  outputPath: './src/models',

  // TypeScript-specific configuration (applies to all TS generators)
  typescriptConfig: {
    enumStyle: 'literal-union',  // Use literal unions instead of enums
    tsModuleFormat: 'esm',       // Use ESM imports
  },

  generators: [
    makePgTsGenerator({
      // PgTsGenerator-specific options:
      customTypeMap: {
        'pg_catalog.tsvector': 'string',
        'pg_catalog.bpchar': 'string',
      },
    }),
  ],
};
```

Note the distinction:
- **typescriptConfig** (top-level) - Applies to any TypeScript generator
- **PgTsGenerator options** (inside `makePgTsGenerator()`) - Specific to PostgreSQL → TypeScript conversion

## Running Kanel

Once you have a config file, run Kanel without any parameters:

```bash
$ npx kanel
```

Or add it to your `package.json` scripts:

```json
{
  "scripts": {
    "generate-types": "kanel"
  }
}
```

Then run:

```bash
$ npm run generate-types
```

## What Gets Generated (PgTsGenerator)

When using `PgTsGenerator`, Kanel generates TypeScript files for each table, view, and other database entities. For a table named `users`, you'll get:

```typescript
// src/models/public/Users.ts

/**
 * Represents the table public.users
 */
export default interface Users {
  id: UserId;
  name: string;
  email: string;
  created_at: Date;
}

/** Identifier type for public.users */
export type UserId = number & { __brand: 'UserId' };

/**
 * Represents the initializer for the table public.users
 */
export interface UsersInitializer {
  id?: UserId;
  name: string;
  email: string;
  created_at?: Date;
}

/**
 * Represents the mutator for the table public.users
 */
export interface UsersMutator {
  id?: UserId;
  name?: string;
  email?: string;
  created_at?: Date;
}
```

## Multiple Generators

You can run multiple generators to produce different outputs:

```javascript
const { makePgTsGenerator, makeMarkdownGenerator } = require('kanel');

module.exports = {
  connection: /* ... */,
  outputPath: './src/models',

  generators: [
    makePgTsGenerator(),      // Generate TypeScript types
    makeMarkdownGenerator(),  // Also generate documentation
  ],
};
```

Each generator runs independently and can produce its own output files.

## Next Steps

- See [configuring](./configuring.md) for full configuration options
- Learn about [PgTsGenerator customization](./configuring.md#pgtsgeneratorconfig) (metadata functions, custom types, etc.)
- Check out the [examples](https://github.com/kristiandupont/kanel/tree/main/examples) for common setups:
  - [Kysely integration](https://github.com/kristiandupont/kanel/tree/main/examples/kysely)
  - [TypeScript + Zod schemas](https://github.com/kristiandupont/kanel/tree/main/examples/ts-plus-zod)
  - [Markdown documentation](https://github.com/kristiandupont/kanel/tree/main/examples/markdown)
- Learn about [workflows](./workflow.md) for using Kanel in your development process

## V3 to V4 Migration

If you're upgrading from V3, your existing V3 configs will continue to work (with a deprecation warning). See the [migration guide](./migration.md) for details on updating to V4.

---
