# hooks

Pre- and post-render hooks that transform output files before and after TypeScript rendering.

- `generateIndexFile.ts` — pre-render: emits a barrel `index.ts` re-exporting all generated types
- `applyTaggedComments.ts` — pre-render: injects PostgreSQL column/table comments as JSDoc
- `markAsGenerated.ts` — post-render: prepends a "do not edit" header
- `formatWithPrettier.ts` — post-render: runs Prettier on the rendered source
- `index.ts` — re-exports all hooks
