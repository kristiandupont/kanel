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
