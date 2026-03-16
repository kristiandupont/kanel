# getRoutineMetadata

::: info PgTsGenerator Configuration
This is a **PgTsGenerator-specific** configuration option. It only applies when using `makePgTsGenerator()` to generate TypeScript types from PostgreSQL. Other generators don't use this function.
:::

```typescript
getRoutineMetadata?: (
  routineDetails: RoutineDetails,
  builtinMetadata: RoutineMetadata,
) => RoutineMetadata;
```

This function allows you to customize how PostgreSQL functions and procedures are transformed into TypeScript type definitions. It's configured inside `makePgTsGenerator()`, not at the top-level config.

The key feature in V4 is that your function receives Kanel's **builtin routine metadata** as the second parameter. This makes it easy to compose your customizations on top of Kanel's defaults:

```typescript
import { makePgTsGenerator } from 'kanel';

const config = {
  generators: [
    makePgTsGenerator({
      getRoutineMetadata: (routineDetails, builtinMetadata) => ({
        ...builtinMetadata,
        returnTypeComment: ['Custom return type comment'],
      }),
    }),
  ],
};
```

::: tip V3 to V4 Migration
In V3, this function received `InstantiatedConfig` as the second parameter and you had to import `defaultGetRoutineMetadata` to get the defaults. In V4, you receive the builtin metadata directly as a parameter.

**V3 pattern (deprecated):**
```typescript
import { defaultGetRoutineMetadata } from 'kanel';

module.exports = {
  getRoutineMetadata: (details, instantiatedConfig) => {
    const defaults = defaultGetRoutineMetadata(details, instantiatedConfig);
    return { ...defaults, returnTypeComment: ['Custom'] };
  },
};
```

**V4 pattern:**
```typescript
import { makePgTsGenerator } from 'kanel';

module.exports = {
  generators: [
    makePgTsGenerator({
      getRoutineMetadata: (routineDetails, builtinMetadata) => ({
        ...builtinMetadata,
        returnTypeComment: ['Custom'],
      }),
    }),
  ],
};
```
:::

## routineDetails

The `routineDetails` parameter describes the routine being processed. It can be either a `FunctionDetails` or `ProcedureDetails` from the `extract-pg-schema` package. The key properties include:

- `name`: The name of the routine
- `schemaName`: The schema the routine is defined in
- `comment`: The comment/documentation for the routine
- `parameters`: Array of parameter definitions
- `returnType`: For functions, this describes the return type which can be either:
  - A simple string type name
  - A table type with columns
  - A composite type

Each parameter in the `parameters` array has the following structure:

```typescript
{
  name: string;
  type: string;
  // ... other properties
}
```

## builtinMetadata

The second parameter contains Kanel's default routine metadata implementation. This allows you to easily extend the defaults:

```typescript
getRoutineMetadata: (routineDetails, builtinMetadata) => {
  // Add custom comment while keeping everything else
  return {
    ...builtinMetadata,
    returnTypeComment: [
      'Custom documentation',
      ...(builtinMetadata.returnTypeComment || []),
    ],
  };
}
```

If you need access to the Kanel context (configuration, schemas, etc.), you can use `useKanelContext()`:

```typescript
import { useKanelContext } from 'kanel';

getRoutineMetadata: (routineDetails, builtinMetadata) => {
  const context = useKanelContext();
  // Access context.config, context.schemas, context.typescriptConfig
  return builtinMetadata;
}
```

## Output

The `RoutineMetadata` type that your function should return is defined as:

```typescript
type RoutineMetadata = {
  path: string; // Path where the types should be generated
  parametersName: string; // Name for the parameters interface
  parameters: PropertyMetadata[]; // Array of parameter definitions
  returnTypeName?: string; // Name for the return type
  returnTypeComment?: string[]; // Optional comments for the return type
  returnTypeOverride?: TypeDefinition; // Optional override for the return type
};
```

## Example

The [ts-plus-zod example](https://github.com/kristiandupont/kanel/blob/main/examples/ts-plus-zod/kanel.config.js) demonstrates customizing routine metadata:

```typescript
import { makePgTsGenerator } from 'kanel';

const config = {
  generators: [
    makePgTsGenerator({
      getRoutineMetadata: (routineDetails, builtinMetadata) => ({
        parametersName: `${routineDetails.name}_params`,
        parameters: routineDetails.parameters.map(({ name }) => ({
          name,
          comment: [],
        })),
        returnTypeName: `${routineDetails.name}_return_type`,
        returnTypeComment: [`Return type for ${routineDetails.name}`],
        path: join(outputPath, routineDetails.name),
      }),
    }),
  ],
};
```
