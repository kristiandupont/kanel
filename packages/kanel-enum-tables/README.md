# Kanel extension to generate enum types from table values

This package extends [Kanel](https://github.com/kristiandupont/kanel) with the ability to generate enum types from table values.

It uses the [Postgraphile](https://www.graphile.org/postgraphile) concept of [enum tables](https://www.graphile.org/postgraphile/enums/#with-enum-tables).

## Smart Comments

Mark a table as an enum table by adding a `@enum` tag to its comment:

```sql
COMMENT ON TABLE animal_type IS '@enum';
```

You can optionally rename the generated type with `@enumName`:

```sql
COMMENT ON TABLE animal_type IS E'@enum\n@enumName TypeOfAnimal';
```

Both Postgraphile's space format and the colon format used by other Kanel extensions are supported:

- `@enumName TypeOfAnimal` (Postgraphile convention)
- `@enumName:TypeOfAnimal` (tagged-comment-parser convention)

> **Note:** `@enumDescription` is not supported at this time.

## Installation

Assuming you already have Kanel installed, add this with

```bash
npm i -D kanel-enum-tables
```

## Usage

Add the hook to your `.kanelrc.js` file:

```javascript
const { enumTablesPreRenderHook } = require("kanel-enum-tables");

module.exports = {
  // ... your config here.

  preRenderHooks: [enumTablesPreRenderHook],
};
```

### With kanel-kysely

When using [kanel-kysely](https://github.com/kristiandupont/kanel/tree/main/packages/kanel-kysely), place `enumTablesPreRenderHook` **before** the kysely hook for best results:

```javascript
const { enumTablesPreRenderHook } = require("kanel-enum-tables");
const { makeKyselyHook } = require("kanel-kysely");

module.exports = {
  // ... your config here.

  preRenderHooks: [enumTablesPreRenderHook, makeKyselyHook()],
};
```

The hook also works if placed after the kysely hook — it will detect the `ColumnType<>` wrappers and update them accordingly.
