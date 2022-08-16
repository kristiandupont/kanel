# generateIdentifierType

```typescript
generateIdentifierType: (c: TableColumn, d: TableDetails) => TypeDeclaration;
```

This function is called for table columns that are marked as primary keys. It can be used to create specific types for such properties.
The default implementation creates a _branded_ type which is a Typescript "trick" for creating nominal types.
