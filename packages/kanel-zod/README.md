# Zod extension for Kanel

This packages extends [Kanel](https://github.com/kristiandupont/kanel) with some [Zod](https://github.com/colinhacks/zod) specific features.

Assuming you already have Kanel installed, add this with

```bash
$ npm i -D kanel-zod
```

## generateZodSchemas

This pre-render hook will generate zod schemas for all your types. The default setup will convert the table name into `camelCase` which is a semi-standard Typescript convention for items that aren't types.

The

To use it, add it to your `.kanelrc.js` file:

```javascript
const { generateZodSchemas } = require('kanel-zod');

module.exports = {
  // ... your config here.

  preRenderHooks: [generateZodSchemas],
};
```
