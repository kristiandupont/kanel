# Migrating from v2

Version 3 introduces significant changes in how Kanel is configured and unless you ran it with an absolute minimum of customization, you will need to make some adjustments.

You can see the new type for the configuration object in [Config.ts](https://github.com/kristiandupont/kanel/blob/main/packages/kanel/src/config-types.ts).

## index.ts

Kanel no longer generates an `index.ts` file per default. There is a hook provided called `generateIndexFile` which you can use if you want it.

You should probably call this as the _last_ hook in your list, as it will create references to everything created by previous hooks.

In `.kanelrc.js`:

```javascript
const { generateIndexFile } = require("kanel");

module.exports = {
  connection: "...",

  // Generate an index file with exports of everything
  preRenderHooks: [generateIndexFile],
};
```

## Nominators

The nominators have been replaced by `getMetadata`, `getPropertyMetadata` and `generateIdentifierType`. These functions can be configured to return a custom name, comment and other things to customize your output.

The hooks are more or less intact as [postRenderHooks](./postRenderHooks.md). Those take a path and an array of strings, allowing you to do crude processing if necessary. However, you will probably prefer to create [preRenderHooks](./preRenderHooks.md) that operate on more abstract data models and allow you more flexibility.

## Ignoring entities

The `schema.ignore` property has been replaced by one general `typeFilter` function which can filter out any table, view or other entity that you don't want to process.

If you used to have an ignore property like this:

```
ignore: [/^celery/, /^djcelery/],
```

you could replace it with this:

```
typeFilter: d => ![/^celery/, /^djcelery/].some((v) => v.test(d.name)),
```

## customTypeMap

The `customTypeMap` has changed slightly as well. It should now be indexed by `schemaName.typeName`. For builtin types, this means you specify them as `pg_catalog.float8` etc. Also, you no longer have to specify array types explicitly as these should be resolved using the same rules as non-array types.

## External types

The `externalTypesFolder` has been removed. Kanel will now assume that all types that are referenced as a simple string are built-in Typescript types (like `string`, `number`, `Record<>`, etc.). If you want to refer to a type that you created in a different file or that exists in an external package, you need to reference it as a `TypeImport`. You can do that in tagged comments like this: `@type(EmailString, "./models/types/EmailString", false, true) Email address` -- this will import a type called `EmailString` from a file of the same name in the types folder. It will be imported as a named import.
