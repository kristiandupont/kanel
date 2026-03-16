# Migration Guide

This guide helps you migrate between Kanel versions. Choose the section that applies to your upgrade path.

## Migrating from V3 to V4

Version 4 introduces a **generator architecture** that makes Kanel more flexible and extensible. The most important change is that Kanel is now a **code generation framework**, not just a "PostgreSQL to TypeScript" tool.

### V3 Configs Still Work!

**Good news:** V3 configs continue to work in V4 with a deprecation warning. You can upgrade to V4 and migrate your config gradually.

### What Changed in V4

The core change is architectural: Kanel is now a generator framework where `PgTsGenerator` is one of many possible generators.

**Key architectural changes:**

1. **Generators array** - You now specify what generators to run
2. **Separated concerns** - Core Kanel config vs generator-specific config
3. **Composable metadata** - Functions receive builtin implementations as parameters
4. **Global vs generator-specific hooks** - Different hook types for different scopes

---

### Step-by-Step Migration

#### 1. Wrap Your Config in `makePgTsGenerator()`

The biggest change: most V3 top-level config options move **inside** `makePgTsGenerator()`.

**V3 config:**

```javascript
module.exports = {
  connection: {
    /* ... */
  },
  outputPath: "./src/models",

  // These were top-level in V3
  customTypeMap: {
    /* ... */
  },
  getMetadata: (details, generateFor, config) => {
    /* ... */
  },
  preRenderHooks: [makeKyselyHook()],
};
```

**V4 config:**

```javascript
const { makePgTsGenerator } = require("kanel");

module.exports = {
  connection: {
    /* ... */
  },
  outputPath: "./src/models",

  // New: generators array
  generators: [
    makePgTsGenerator({
      // PgTs-specific config moves here
      customTypeMap: {
        /* ... */
      },
      getMetadata: (details, generateFor, builtinMetadata) => {
        /* ... */
      },
      preRenderHooks: [makeKyselyHook()],
    }),
  ],
};
```

#### 2. Update TypeScript Configuration

`enumStyle` and module format settings move to `typescriptConfig`:

**V3:**

```javascript
module.exports = {
  enumStyle: "type",
  tsModuleFormat: "esm",
};
```

**V4:**

```javascript
module.exports = {
  typescriptConfig: {
    enumStyle: "literal-union", // 'type' renamed to 'literal-union'
    tsModuleFormat: "esm",
  },
};
```

Note: V4 default is `'literal-union'` (was `'enum'` in V3).

#### 3. Update Metadata Functions

Metadata functions now receive builtin implementations as their last parameter instead of `instantiatedConfig`.

**V3 pattern:**

```javascript
const { defaultGetMetadata } = require("kanel");

module.exports = {
  getMetadata: (details, generateFor, instantiatedConfig) => {
    const defaults = defaultGetMetadata(
      details,
      generateFor,
      instantiatedConfig,
    );
    return {
      ...defaults,
      comment: ["Custom comment"],
    };
  },
};
```

**V4 pattern:**

```javascript
const { makePgTsGenerator } = require("kanel");

module.exports = {
  generators: [
    makePgTsGenerator({
      getMetadata: (details, generateFor, builtinMetadata) => ({
        ...builtinMetadata,
        comment: ["Custom comment"],
      }),
    }),
  ],
};
```

**Key differences:**

- No more importing `defaultGetMetadata` - you receive it as `builtinMetadata`
- Same pattern for `getPropertyMetadata`, `generateIdentifierType`, `getRoutineMetadata`
- No more `instantiatedConfig` parameter - use `useKanelContext()` if needed

#### 4. Update Hooks to Use useKanelContext()

The biggest change for hooks: V3 hooks received \`instantiatedConfig\` as a parameter. **V4 hooks do not receive config** - instead, use \`useKanelContext()\` when you need access to context.

::: warning Important
In V4, hooks don't receive configuration as a parameter. The "two types of hooks" (global vs PgTs-specific) only exist in V3 compatibility mode. In pure V4, all hooks use \`useKanelContext()\` to access context.
:::

**Pre-render hooks:**

**V3:**
\`\`\`javascript
module.exports = {
  preRenderHooks: [
    makeKyselyHook(),
    generateZodSchemas,
    (outputAcc, instantiatedConfig) => {
      // Had direct access to config
      const outputPath = instantiatedConfig.outputPath;
      return outputAcc;
    },
  ],
};
\`\`\`

**V4:**
\`\`\`javascript
const { makePgTsGenerator, useKanelContext } = require('kanel');

module.exports = {
  generators: [
    makePgTsGenerator({
      // Extension hooks go here (Kysely, Zod, etc.)
      preRenderHooks: [
        makeKyselyHook(),
        generateZodSchemas,
      ],
    }),
  ],

  // Global hooks use useKanelContext() if they need config
  preRenderHooks: [
    (outputAcc) => {
      const context = useKanelContext();
      const outputPath = context.config.outputPath;
      return outputAcc;
    },
  ],
};
\`\`\`

**Post-render hooks:**

**V3:**
\`\`\`javascript
module.exports = {
  postRenderHooks: [
    (path, lines, instantiatedConfig) => {
      const outputPath = instantiatedConfig.outputPath;
      return lines;
    },
  ],
};
\`\`\`

**V4:**
\`\`\`javascript
const { useKanelContext } = require('kanel');

module.exports = {
  postRenderHooks: [
    (path, lines) => {
      const context = useKanelContext();
      const outputPath = context.config.outputPath;
      return lines;
    },
  ],
};
\`\`\`

See [useKanelContext](./useKanelContext.md) for complete documentation on accessing context in V4.

#### 5. Update Filter Function

`typeFilter` renamed to `filter`:

**V3:**

```javascript
module.exports = {
  typeFilter: (pgType) => pgType.schemaName === "public",
};
```

**V4:**

```javascript
module.exports = {
  filter: (pgType) => pgType.schemaName === "public",
};
```

You can also add generator-specific filters:

```javascript
generators: [
  makePgTsGenerator({
    filter: (pgType) => !pgType.name.startsWith("_"),
  }),
];
```

#### 6. Explicitly Add Default Hooks (If Desired)

V3 automatically applied `applyTaggedComments` and `markAsGenerated`. V4 does not.

**If you want V3 behavior:**

```javascript
const { makePgTsGenerator, markAsGenerated } = require("kanel");

module.exports = {
  generators: [makePgTsGenerator()],
  postRenderHooks: [markAsGenerated],
};
```

Note: `applyTaggedComments` is deprecated in V4. Use tagged comments in your database schema instead, or write a custom metadata function.

---

### Complete Migration Example

**V3 config:**

```javascript
const { makeKyselyHook } = require("kanel-kysely");
const { generateZodSchemas } = require("kanel-zod");

module.exports = {
  connection: {
    host: "localhost",
    database: "mydb",
  },

  outputPath: "./src/models",
  preDeleteOutputFolder: true,
  enumStyle: "type",

  customTypeMap: {
    "pg_catalog.tsvector": "string",
  },

  getMetadata: (details, generateFor, config) => {
    const { defaultGetMetadata } = require("kanel");
    const defaults = defaultGetMetadata(details, generateFor, config);
    return { ...defaults, comment: ["Custom"] };
  },

  preRenderHooks: [makeKyselyHook(), generateZodSchemas],
};
```

**V4 config:**

```javascript
const { makePgTsGenerator } = require("kanel");
const { makeKyselyHook } = require("kanel-kysely");
const { generateZodSchemas } = require("kanel-zod");

module.exports = {
  connection: {
    host: "localhost",
    database: "mydb",
  },

  outputPath: "./src/models",
  preDeleteOutputFolder: true,

  typescriptConfig: {
    enumStyle: "literal-union", // 'type' renamed
  },

  generators: [
    makePgTsGenerator({
      customTypeMap: {
        "pg_catalog.tsvector": "string",
      },

      getMetadata: (details, generateFor, builtinMetadata) => ({
        ...builtinMetadata,
        comment: ["Custom"],
      }),

      preRenderHooks: [makeKyselyHook(), generateZodSchemas],
    }),
  ],
};
```

---

### Breaking Changes Summary

| Change                   | V3                         | V4                                   |
| ------------------------ | -------------------------- | ------------------------------------ |
| **Config structure**     | Flat                       | Generators array                     |
| **PgTs config location** | Top-level                  | Inside `makePgTsGenerator()`         |
| **Enum style option**    | `'type'` or `'enum'`       | `'literal-union'` or `'enum'`        |
| **Enum style default**   | `'enum'`                   | `'literal-union'`                    |
| **Metadata parameter**   | `instantiatedConfig`       | `builtinMetadata` / `builtinType`    |
| **Hook parameter**       | `instantiatedConfig`       | Use `useKanelContext()`              |
| **Filter name**          | `typeFilter`               | `filter`                             |
| **PgTs hooks location**  | Top-level `preRenderHooks` | `PgTsGeneratorConfig.preRenderHooks` |
| **Default hooks**        | Auto-applied               | Explicit opt-in                      |

### Options That Moved

These options moved from top-level config to `PgTsGeneratorConfig` (inside `makePgTsGenerator()`):

- `customTypeMap`
- `getMetadata`
- `getPropertyMetadata`
- `generateIdentifierType`
- `getRoutineMetadata`
- `propertySortFunction`
- Pre-render hooks that use PgTs context (Kysely, Zod, Knex, etc.)

### Deprecated Functions

These V3 exports are deprecated in V4:

- `defaultGetMetadata` - Use `builtinMetadata` parameter instead
- `defaultGetPropertyMetadata` - Use `builtinMetadata` parameter instead
- `defaultGenerateIdentifierType` - Use `builtinType` parameter instead
- `defaultGetRoutineMetadata` - Use `builtinMetadata` parameter instead
- `applyTaggedComments` - Use database comments or custom metadata functions
- `usePgTsGeneratorContext()` - Use the context parameter in PgTs hooks instead

---

### Why These Changes?

V4's architecture enables:

1. **Multiple generators** - Generate TypeScript, Markdown, Python, etc. from one schema
2. **Cleaner separation** - Core Kanel config vs generator-specific config
3. **Better composability** - Builtin metadata makes customization easier
4. **Type safety** - PgTs hooks receive typed context as a parameter
5. **Extensibility** - Write custom generators for any language or format

---

## Migrating from V2 to V3

If you're still on V2, migrate to V3 first, then to V4.

### index.ts

Kanel no longer generates an `index.ts` file by default. Use `generateIndexFile` if you need it:

```javascript
const { generateIndexFile } = require("kanel");

module.exports = {
  connection: "...",
  preRenderHooks: [generateIndexFile],
};
```

### Nominators

Nominators were replaced by `getMetadata`, `getPropertyMetadata`, and `generateIdentifierType`.

### Ignoring Entities

`schema.ignore` was replaced by `typeFilter`:

**V2:**

```javascript
ignore: [/^celery/, /^djcelery/];
```

**V3:**

```javascript
typeFilter: (d) => ![/^celery/, /^djcelery/].some((v) => v.test(d.name));
```

### customTypeMap

Keys must now be schema-qualified:

**V2:**

```javascript
customTypeMap: {
  'float8': 'number'
}
```

**V3:**

```javascript
customTypeMap: {
  'pg_catalog.float8': 'number'
}
```

Array types no longer need explicit entries.

### External Types

`externalTypesFolder` was removed. Use `TypeImport` in tagged comments or custom metadata functions instead.

---

## Need Help?

- See the [examples directory](https://github.com/kristiandupont/kanel/tree/main/examples) for complete V4 configs
- Check the [configuration guide](./configuring.md) for detailed V4 documentation
- Open an issue on [GitHub](https://github.com/kristiandupont/kanel/issues) if you encounter migration problems
