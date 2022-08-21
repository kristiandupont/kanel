# Migrating from v2

Version 3 introduces significant changes in how Kanel is configured and unless you ran it with an absolute minimum of customization, you will need to make some adjustments.

You can see the new type for the configuration object in [Config.ts](../src/Config.ts).

The nominators have been replaced by `getMetadata`, `getPropertyMetadata` and `generateIdentifierType`. These functions can be configured to return a custom name, comment and other things to customize your output.

The hooks are more or less intact as `postRenderHooks`. Those take a path and an array of strings, allowing you to do crude processing if necessary. However, you will probably prefer to create `preRenderHooks` that operate on more abstract data models and allow you more flexibility.

The `schema.ignore` property has been replaced by one general `typeFilter` function which can filter out any table, view or other entity that you don't want to process.

The `externalTypesFolder` has been removed. Kanel will now assume that all types that are referenced as a simple string are built-in Typescript types (like `string`, `number`, `Set`, etc.). If you want to refer to a type that you created in a different file or that exists in an external package, you need to reference it as a `TypeImport`. You can do that in tagged comments like this: `@type(EmailString, "./models/types/EmailString", false, true) Email address` -- this will import a type called `EmailString` from a file of the same name in the types folder. It will be imported as a named import.
