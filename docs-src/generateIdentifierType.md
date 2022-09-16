# generateIdentifierType

```typescript
generateIdentifierType: (
  column: TableColumn,
  details: TableDetails,
  config: InstantiatedConfig
) => TypeDeclaration;
```

This function is called for table columns that are marked as primary keys. It can be used to create specific types for such properties.

The default implementation creates a _branded_ type which is a [Typescript trick](https://www.typescriptlang.org/play#example/nominal-typing) for creating nominal types. With these, you can be certain that you don't accidentally end up assigning a `MemberId` to an `AccountId`, even if those are both represented as integers in the database.

It looks like this:

<<< @/../packages/kanel/src/default-metadata-generators.ts#defaultGenerateIdentifierType
