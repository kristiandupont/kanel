# getPropertyMetadata

::: info PgTsGenerator Configuration
This is a **PgTsGenerator-specific** configuration option. It only applies when using `makePgTsGenerator()` to generate TypeScript types from PostgreSQL. Other generators don't use this function.
:::

```typescript
getPropertyMetadata?: (
  property: CompositeProperty,
  details: CompositeDetails,
  generateFor: "selector" | "initializer" | "mutator",
  builtinMetadata: PropertyMetadata,
) => PropertyMetadata;
```

This function allows you to customize how PostgreSQL columns/attributes are transformed into TypeScript interface properties. It's configured inside `makePgTsGenerator()`, not at the top-level config.

The key feature in V4 is that your function receives Kanel's **builtin property metadata** as the fourth parameter. This makes it easy to compose your customizations on top of Kanel's defaults:

```typescript
import { makePgTsGenerator } from 'kanel';

const config = {
  generators: [
    makePgTsGenerator({
      getPropertyMetadata: (property, details, generateFor, builtinMetadata) => ({
        ...builtinMetadata,
        comment: [
          `Database type: ${property.expandedType}`,
          ...(builtinMetadata.comment || []),
        ],
      }),
    }),
  ],
};
```

::: tip V3 to V4 Migration
In V3, this function received `InstantiatedConfig` as the fourth parameter and you had to import `defaultGetPropertyMetadata` to get the defaults. In V4, you receive the builtin metadata directly as a parameter.

**V3 pattern (deprecated):**
```typescript
import { defaultGetPropertyMetadata } from 'kanel';

module.exports = {
  getPropertyMetadata: (property, details, generateFor, instantiatedConfig) => {
    const defaults = defaultGetPropertyMetadata(property, details, generateFor, instantiatedConfig);
    return { ...defaults, comment: ['Custom'] };
  },
};
```

**V4 pattern:**
```typescript
import { makePgTsGenerator } from 'kanel';

module.exports = {
  generators: [
    makePgTsGenerator({
      getPropertyMetadata: (property, details, generateFor, builtinMetadata) => ({
        ...builtinMetadata,
        comment: ['Custom'],
      }),
    }),
  ],
};
```
:::

## property

This is the column or attribute that you should return data for. Depending on whether the type we're processing is a table, a view, a materialized view or a composite type, the properties in this property may vary but they will generally look more or less like this type:

```typescript
export interface TableColumn {
  name: string;
  expandedType: string;
  type: TableColumnType;
  comment: string | null;
  defaultValue: any;
  isArray: boolean;
  dimensions: number;
  reference: ColumnReference | null;
  indices: Index[];
  maxLength: number | null;
  isNullable: boolean;
  isPrimaryKey: boolean;
  generated: "ALWAYS" | "NEVER" | "BY DEFAULT";
  isUpdatable: boolean;
  isIdentity: boolean;
  ordinalPosition: number;

  informationSchemaValue: InformationSchemaColumn;
}
```

## details

This parameter represents the table/view/materialized view/composite type that the property belongs to. You may or may not need this, depending on your implementation.

## generateFor

Properties are generated for selectors as well as initializers and mutators. If you want the output property to differ depending on this, use this parameter to decide.

## builtinMetadata

The fourth parameter contains Kanel's default property metadata implementation. This allows you to easily extend the defaults:

```typescript
getPropertyMetadata: (property, details, generateFor, builtinMetadata) => {
  // Add database type info to comments
  return {
    ...builtinMetadata,
    comment: [
      `Database type: ${property.expandedType}`,
      ...(builtinMetadata.comment || []),
    ],
  };
}
```

If you need access to the Kanel context (configuration, schemas, etc.), you can use `useKanelContext()`:

```typescript
import { useKanelContext } from 'kanel';

getPropertyMetadata: (property, details, generateFor, builtinMetadata) => {
  const context = useKanelContext();
  // Access context.config, context.schemas, context.typescriptConfig
  return builtinMetadata;
}
```

## Output

You should return a value of this type:

```typescript
export type PropertyMetadata = {
  name: string;
  comment: string[] | undefined;
  typeOverride?: TypeDefinition;
  nullableOverride?: boolean;
  optionalOverride?: boolean;
};
```

The `name` field will be the actual name of the property. The default implementation will pass the name through so it matches what you have in the database. As there is a convention for using `snake_case` in Postgres, this will break the Typescript convention of using `camelCase` for properties. If you want to, you could make your interfaces match the Typescript convention, though you will then need to do that conversion when you send and receive values from the database.

The `comment` array will be the comments that go above the property. It will be enclosed in JSDoc style comments: `/** ... */`, so you can use JSDoc syntax and tags to refine documentation.

The three `*Override` values can be set if you want to override the default resolution of whether this property should be nullable or optional, or if you want to override the base type itself.

## Example

See the [ts-plus-zod example](https://github.com/kristiandupont/kanel/blob/main/examples/ts-plus-zod/kanel.config.js) for a real-world V4 implementation.
