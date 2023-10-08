# postRenderHooks

In Kanel, "rendering" means translating a bunch of declarations into arrays of strings that will ultimately become files.
You can apply hooks before and after this step if you want to make some custom modifications or additions to the final output.

A post-render hook has the following signature:

```typescript
export type PostRenderHook = (
  path: string,
  lines: string[],
  instantiatedConfig: InstantiatedConfig,
) => Awaitable<string[]>;
```

For every file that is about to be written, this function will be called. The `lines` parameter is the raw strings that will comprise the file. You should return the entire array of lines that you want the file to contain.

The function receives the instantiated configuration (i.e. the settings as well as the extracted schemas) in case you need any information from there.
