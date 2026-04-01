# useKanelContext

`useKanelContext()` is the V4 way to access Kanel's runtime context (configuration, schemas, etc.) from within hooks and custom functions.

## Overview

In V4, hooks no longer receive configuration as a parameter. Instead, you use `useKanelContext()` to access the context when needed:

**V3 (deprecated):**

```javascript
module.exports = {
  preRenderHooks: [
    (outputAcc, instantiatedConfig) => {
      console.log(instantiatedConfig.outputPath);
      return outputAcc;
    },
  ],
};
```

**V4:**

```javascript
import { useKanelContext } from "kanel";

module.exports = {
  preRenderHooks: [
    (outputAcc) => {
      const context = useKanelContext();
      console.log(context.config.outputPath);
      return outputAcc;
    },
  ],
};
```

## The KanelContext Type

`useKanelContext()` returns a `KanelContext` object with the following structure:

```typescript
type KanelContext = {
  /** General TypeScript configuration affecting all TypeScript generators */
  typescriptConfig: TypescriptConfig;

  /** Original config as passed to Kanel */
  config: Config;

  /** Extracted database schemas */
  schemas: Record<string, Schema>;
};
```

### typescriptConfig

Contains TypeScript-specific settings that apply to all TypeScript generators:

```javascript
const context = useKanelContext();

console.log(context.typescriptConfig.enumStyle); // 'literal-union' or 'enum'
console.log(context.typescriptConfig.tsModuleFormat); // 'esm', 'commonjs', etc.
```

### config

The original configuration object as passed to Kanel. This is either a V3 or V4 config:

```javascript
const context = useKanelContext();

console.log(context.config.connection); // Database connection config
console.log(context.config.outputPath); // Output directory
console.log(context.config.preDeleteOutputFolder); // Boolean
console.log(context.config.generators); // Array of generator functions (V4)
```

### schemas

The extracted database schemas as a record keyed by schema name:

```javascript
const context = useKanelContext();

const publicSchema = context.schemas.public;

// Iterate over all tables in the public schema
for (const table of publicSchema.tables) {
  console.log(table.name);
  console.log(table.columns);
}

// Access views, enums, etc.
console.log(publicSchema.views);
console.log(publicSchema.types);
```

The `Schema` type comes from [extract-pg-schema](https://github.com/kristiandupont/extract-pg-schema) and contains:

- `tables` - Table definitions
- `views` - View definitions
- `materializedViews` - Materialized view definitions
- `types` - Composite types, enums, domains, ranges

## How It Works

`useKanelContext()` uses Node.js's [`AsyncLocalStorage`](https://nodejs.org/api/async_context.html#class-asynclocalstorage) to provide context that's automatically available throughout the async execution chain.

## See Also

- [preRenderHooks](./preRenderHooks.md) - Using context in pre-render hooks
- [postRenderHooks](./postRenderHooks.md) - Using context in post-render hooks
- [Migration Guide](./migration.md) - Complete V3 to V4 migration guide
