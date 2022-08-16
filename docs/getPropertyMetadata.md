# getPropertyMetadata

```typescript
getPropertyMetadata: (
  property: CompositeProperty,
  details: CompositeDetails,
  generateFor: 'selector' | 'initializer' | 'mutator'
) => PropertyMetadata;
```

This function will give Kanel the information it needs about a specific property in an interface. It is called when generating types for tables, views, materialized views and composite types, i.e. anything that has "properties".

## property
