# Zod extension for Kanel

Generate [Zod](https://github.com/colinhacks/zod) schemas directly from your Postgres database.
This packages extends [Kanel](https://github.com/kristiandupont/kanel) with some Zod specific features.

```typescript
/** Zod schema for actor */
export const actor = z.object({
  actor_id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  last_update: z.date(),
});
```

Assuming you already have Kanel installed, add this with

```bash
$ npm i -D kanel-zod
```

## generateZodSchemas

This pre-render hook will generate zod schemas for all your types. The default setup will convert the table name into `camelCase` which is a semi-standard Typescript convention for items that aren't types.

The

To use it, add it to your `.kanelrc.js` file:

```javascript
const { generateZodSchemas } = require("kanel-zod");

module.exports = {
  // ... your config here.

  preRenderHooks: [generateZodSchemas],
};
```
## Usage with `zodCamelCaseHook`

This pre-render hook will transform all zod object properties to `camelCase`, for example:

```javascript
/**Before the hook  */
export const actor = z.object({
  actor_id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  last_update: z.date(),
});

/**After the hook  */
export const actor = z.object({
  actorId: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  lastUpdate: z.date(),
});
```

To use it, add it to your `.kanelrc.js` file:

```javascript
const { zodCamelCaseHook } = require("kanel-zod");

module.exports = {
  // ... your config here.

  preRenderHooks: [generateZodSchemas, zodCamelCaseHook],
};
```
