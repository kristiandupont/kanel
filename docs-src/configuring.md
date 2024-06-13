# Configuring

Here is a semi-complex example `.kanelrc.js` configuration file, taken from the [example](https://github.com/kristiandupont/kanel/tree/master/example):

<<< @/../example/.kanelrc.js

## Migrating from v2

The update to version 3 introduced several breaking changes. If you are doing this migration, check out the [guide](./migration.md) for help.

---

# The Config type

The configuration type is defined in the [Config.ts](../packages/kanel/src/config-types.ts) file:

<<< @/../packages/kanel/src/config-types.ts#Config

## connection

The only required property in the config object is `connection`.

This is the database connection object. It follows the [`client`](https://node-postgres.com/api/client) constructor in [pg](https://www.npmjs.com/package/pg). As you will typically want to run Kanel on your development machine, you probably want a simple localhost connection as in the example above.

## schemas

The `schemas` property can be an array of strings. This will be used as the list of schema names to include when generating types. If omitted, all the non-system schemas found in the database will be processed.

## typeFilter

The `typeFilter` property allows you to choose which types (be that tables, views, enums, or whatever else) to include.

## getMetadata, getPropertyMetadata and generateIdentifierType

If you really want to customize the behavior of Kanel, you can provide values for the [getMetaData](./getMetadata.md), the [getPropertyMetadata](./getPropertyMetadata.md) and/or the [generateIdentifierType](./generateIdentifierType.md) functions.

## propertySortFunction

The `propertySortFunction` can be supplied if you want to customize how the properties in types should be sorted. The default behavior is to put primary keys at the top and otherwise follow the ordinal order as is specified in the database.

## enumStyle

The `enumStyle` can be either `type` or `enum` (default). Postgres enums will then be turned into either string unions or Typescript enums.

This, if you have an enum `Fruit` consisting of the values `apples`, `oranges` and `bananas`, you will get this type with `enumStyle === 'type'`:

```typescript
type Fruit = "apples" | "oranges" | "bananas";
```

..or, with `enumStyle === 'enum'`:

```typescript
enum Fruit {
  apples = "apples",
  oranges = "oranges",
  bananas = "bananas",
}
```

## outputPath

The `outputPath` specifies the root for the output files. The default implementation of `getMetadata` will place files in `${outputPath}/${schemaName}/${typeName}.ts`.

## preDeleteOutputFolder

If you set `preDeleteOutputFolder` to true, Kanel will delete _all_ contents in the folder before writing types. This is recommended as it will make sure you don't have old model files of no-longer-existing database entities sitting around. Obviously it means that you shouldn't mix in any manually written code in that same folder though.

## customTypeMap

The `customTypeMap` property can be set if you want to specify what a given type should map to. It's a record of a postgres typename to a Typescript type. The key is qualified with schema name, which for built-in types means that they should be prefixed with `pg_catalog`. So for instance if you want to map `float8` to `number` (as opposed to the default `string`), you would set it like this:

```typescript
{
  'pg_catalog.float8': 'number'
}
```

## resolveViews

If you set `resolveViews` to true, Kanel will attempt to give you better types for views. If a view returns, say, a column called `account_id` that represents a foreign key in the original table, we would like the resulting type to be `AccountId` or whatever we call our identifier types. Similarly, we would like to mark it as `nullable` only if the "source" column is nullable. Postgres will per default not give us these data about views, so Kanel attempts to infer them by parsing the SQL that defines the view. Obviously, this non-trivial and there are situations where it fails so use with slight caution.

## preRenderHooks

The `preRenderHooks` property can be set if you want to supply one or more hooks that will run before the render step. At this point, Kanel has gathered a record of file paths and corresponding `Declaration` arrays. A declaration is an abstract bit of Typescript like an interface or type definition.

See the [preRenderHooks](./preRenderHooks.md) section for more info.

## postRenderHooks

If you need to do something more brute-force like, you might prefer to create one or more `postRenderHooks`, which will be called with a filename and an array of strings which are the raw contents, just before the file is written.

See the [postRenderHooks](./postRenderHooks.md) section for more info.
