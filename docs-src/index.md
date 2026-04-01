<div>
  <h1 class="logo">kanel</h1>
  <h2 class="payoff">Source of truth: PostgreSQL</h2>
</div>

Kanel is a **code generation framework** that transforms your PostgreSQL database schema into various output formats. Most commonly, it generates TypeScript types that look like this:

<<< @/../examples/ts-plus-zod/models/City.ts

## How It Works

Kanel inspects a live PostgreSQL database and uses **generators** to produce code or documentation. Think of it as a reverse ORM that keeps your database as the source of truth.

### The Generator Architecture

Kanel v4 is built around a pluggable generator system:

- **PgTsGenerator** - Generates TypeScript types (the most common use case)
- **MarkdownGenerator** - Generates human/LLM-friendly documentation
- **Custom generators** - You can write generators for Python, Rust, GraphQL, or anything else

```javascript
const { makePgTsGenerator, makeMarkdownGenerator } = require('kanel');

module.exports = {
  connection: /* ... */,
  generators: [
    makePgTsGenerator(),      // Generate TypeScript types
    makeMarkdownGenerator(),  // Generate documentation
  ],
};
```

## Why Kanel?

- **Database as source of truth** - Your schema drives your types, not the other way around
- **Type safety** - Generate accurate TypeScript types including branded IDs, nullability, and relations
- **Extensible** - Integrate with Kysely, Zod, Knex, and more through hooks
- **Flexible** - Write custom generators for any language or format
- **Developer workflow** - Check generated code into git and treat it as part of your codebase

## Quick Start

```bash
# Try it instantly
npx kanel -d postgresql://localhost:5432/mydb -o ./src/models

# Or install it
npm i -D kanel
```

See [Getting Started](./getting-started.md) for a complete guide.

## Common Use Cases

### TypeScript + Kysely

Generate TypeScript types with Kysely database interface:

```javascript
const { makePgTsGenerator } = require('kanel');
const { makeKyselyHook } = require('kanel-kysely');

module.exports = {
  connection: /* ... */,
  generators: [
    makePgTsGenerator({
      preRenderHooks: [makeKyselyHook()],
    }),
  ],
};
```

### TypeScript + Zod Schemas

Generate both TypeScript types and Zod validation schemas:

```javascript
const { makePgTsGenerator } = require('kanel');
const { generateZodSchemas } = require('kanel-zod');

module.exports = {
  connection: /* ... */,
  generators: [
    makePgTsGenerator({
      preRenderHooks: [generateZodSchemas],
    }),
  ],
};
```

### Documentation Only

Generate markdown documentation without TypeScript:

```javascript
const { makeMarkdownGenerator } = require('kanel');

module.exports = {
  connection: /* ... */,
  generators: [makeMarkdownGenerator()],
};
```

See the [examples directory](https://github.com/kristiandupont/kanel/tree/main/examples) for complete configurations.

## Learn More

The idea was introduced in [this blog post](https://thoughts.kristiandupont.com/p/generating-typescript-types-from-postgres-48661868ef84).

---

Copyright &copy; 2018 [Kristian Dupont](https://www.kristiandupont.com), licensed under the [MIT License](https://opensource.org/licenses/MIT)

![Cinnamon](https://images.unsplash.com/photo-1530991472021-ce0e43475f6e?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MzB8fGNpbm5hbW9ufGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=900&q=60)
