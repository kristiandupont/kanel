# Knex extension for Kanel

This packages extends [Kanel](https://github.com/kristiandupont/kanel) with some [Knex](https://knexjs.org) specific features.

## knex-tables

Knex supports "implicit" type detection with a declared `knex/types/tables` module. This package can generate that for you. It's a pre-render hook called `generateKnexTablesModule`.

It will create a file in your output folder called `knex-tables.ts` which will cover this.

To use it, add it to your `.kanelrc.js` file:

```javascript
const { generateKnexTablesModule } = require('@kanel/knex');

module.exports = {
  // ... your config here.

  preRenderHooks: [generateKnexTablesModule],
};
```

## type filter

If you are using Knex for migrations, you will have two tables in your database called `knex_migrations` and `knex_migrations_lock`, which you probably don't care about and don't want types for. The `knexTypeFilter` will remove those for you.

To use it, add it to your `.kanelrc.js` file:

```javascript
const { knexTypeFilter } = require('@kanel/knex');

module.exports = {
  // ... your config here.

  typeFilter: knexTypeFilter,
};
```

Note that type filters are simple predicates. If you have multiple, they can easily be combined with a function like this:

```javascript
const combineFilters =
  (...filters) =>
  (t) =>
    filters.every((f) => f(t));
```

## migration check

However, you might want to check that your code is in sync with the database in terms of migrations, so that the types that your code was compiled with match what the database looks like.

The `generateMigrationCheck` pre-render hook will create a file for you that contains a function called `validateMigration`. This function will check the live database for the `knex_migration` table and check if it matches what was there when the code was generated.

To use it, add it to your `.kanelrc.js` file:

```javascript
const { generatMigrationCheck } = require('@kanel/knex');

module.exports = {
  // ... your config here.

  preRenderHooks: [generateMigrationCheck],
};
```
