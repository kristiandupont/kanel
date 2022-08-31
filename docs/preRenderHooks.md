# preRenderHooks

In Kanel, "rendering" means translating a bunch of declarations into arrays of strings that will ultimately become files.
You can apply hooks before and after this step if you want to make some custom modifications or additions to the final output.

A pre-render hook has the following signature:

```typescript
export type PreRenderHook = (
  outputAcc: Output,
  instantiatedConfig: InstantiatedConfig
) => Output;
```

The `outputAcc` (short for accumulated output) will contain the output as it looks when calling this hook. The hook should return the _entire_ output as it should appear after processing.

An `Output` instance is a record of paths (strings) and `Declaration`s. Each entry represents a file that will be written to the file system. Declarations can be either `typeDeclaration`, `interface` or `generic`. If you want to create just any code, use the last kind (`generic`) where you can just add raw string lines.
Any declaration can contain a number of comment lines and a number of type imports. Comment lines go into the property `comment`, and they will be rendered as JSDoc comments, i.e. with `/** ... */` syntax. The type imports can specify if the declaration needs to import something from another package (not necessarily only types).

To understand declarations better, look at the [declaration-types.ts](../src/declaration-types.ts) file:

<<< @/../src/declaration-types.ts

The function receives the instantiated configuration (i.e. the settings as well as the extracted schemas) in case you need any information from there.
