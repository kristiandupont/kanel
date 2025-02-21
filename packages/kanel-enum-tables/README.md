# Kanel extension to generate enum types from table values

This packages extends [Kanel](https://github.com/kristiandupont/kanel) with the the ability to generate enum types from table values.

It uses the [Postgraphile](https://www.graphile.org/postgraphile) concept of [enum tables](https://www.graphile.org/postgraphile/enums/#with-enum-tables).

> Note: @enumDescription is not supported at this time.

Assuming you already have Kanel installed, add this with

```bash
$ npm i -D kanel-enum-tables
```

## generateEnumTypesFromTableValuesModule

To use it, add it to your `.kanelrc.js` file:

```javascript
const { enumTablesPreRenderHook } = require("kanel-enum-tables");

module.exports = {
  // ... your config here.

  preRenderHooks: [enumTablesPreRenderHook],
};
```
