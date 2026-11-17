# generateIdentifierType

::: info PgTsGenerator Configuration
This is a **PgTsGenerator-specific** configuration option. It only applies when using `makePgTsGenerator()` to generate TypeScript types from PostgreSQL. Other generators don't use this function.
:::

```typescript
generateIdentifierType?: (
  column: TableColumn | ForeignTableColumn,
  details: TableDetails | ForeignTableDetails,
  builtinType: TypeDeclaration,
) => TypeDeclaration;
```

This function allows you to customize how branded/flavored identifier types for primary keys are generated in TypeScript. It's configured inside `makePgTsGenerator()`, not at the top-level config.

The key feature in V4 is that your function receives Kanel's **builtin type declaration** as the third parameter. This makes it easy to compose your customizations on top of Kanel's defaults.

## Default Implementation

The default implementation creates a _branded_ type which is a [Typescript trick](https://www.typescriptlang.org/play#example/nominal-typing) for creating nominal types. With these, you can be certain that you don't accidentally end up assigning a `MemberId` to an `AccountId`, even if those are both represented as integers in the database.

The builtin implementation looks like this:

<<< @/../packages/kanel/src/default-metadata-generators.ts#defaultGenerateIdentifierType

## Example: Flavored Types Instead of Branded

The [ts-plus-zod example](https://github.com/kristiandupont/kanel/blob/main/examples/ts-plus-zod/kanel.config.js) demonstrates using "flavored" types instead of "branded" types:

```typescript
import { makePgTsGenerator } from 'kanel';
import { recase } from '@kristiandupont/recase';

const toPascalCase = recase('snake', 'pascal');

const config = {
  generators: [
    makePgTsGenerator({
      generateIdentifierType: (column, details, builtinType) => {
        const name = toPascalCase(column.name);

        return {
          declarationType: 'typeDeclaration',
          name,
          exportAs: 'named',
          typeDefinition: [`number & { __flavor?: '${name}' }`],
          comment: [`Identifier type for ${details.name}`],
        };
      },
    }),
  ],
};
```

This creates types like:

```typescript
/** Identifier type for users */
export type UserId = number & { __flavor?: 'UserId' };
```

The difference between branded and flavored types is that flavored types use an optional property (`__flavor?`) which makes them slightly more flexible in some use cases.

::: tip V3 to V4 Migration
In V3, this function received `InstantiatedConfig` as the third parameter and you had to import `defaultGenerateIdentifierType` to get the defaults. In V4, you receive the builtin type declaration directly as a parameter.

**V3 pattern (deprecated):**
```typescript
import { defaultGenerateIdentifierType } from 'kanel';

module.exports = {
  generateIdentifierType: (column, details, instantiatedConfig) => {
    const defaultType = defaultGenerateIdentifierType(column, details, instantiatedConfig);
    return { ...defaultType, comment: ['Custom ID'] };
  },
};
```

**V4 pattern:**
```typescript
import { makePgTsGenerator } from 'kanel';

module.exports = {
  generators: [
    makePgTsGenerator({
      generateIdentifierType: (column, details, builtinType) => ({
        ...builtinType,
        comment: ['Custom ID'],
      }),
    }),
  ],
};
```
:::

## When to Use

Use `generateIdentifierType` when you want to:

- Change from branded to flavored types (or vice versa)
- Customize the naming convention for identifier types
- Add custom comments to identifier types
- Change how the underlying type is determined

If you're happy with Kanel's default branded types, you don't need to provide this function.

## How to Disable

You can disable default branded types (`generateIdentifierType`) like this:

```typescript
module.exports = {
  generators: [
    makePgTsGenerator({
      generateIdentifierType: false,
    }),
  ],
};
```
