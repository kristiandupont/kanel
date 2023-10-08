# getPropertyMetadata

```typescript
getPropertyMetadata: (
  property: CompositeProperty,
  details: CompositeDetails,
  generateFor: "selector" | "initializer" | "mutator",
  config: InstantiatedConfig,
) => PropertyMetadata;
```

This function will give Kanel the information it needs about a specific property in an interface. It is called when generating types for tables, views, materialized views and composite types, i.e. anything that has "properties".

## property

This is the column or attribute that you should return data for. Depending on whether the type we're processing is a table, a view, a materialized view or a composite type, the properties in this property may vary but they will generally look more or less like this type:

```typescript
export interface TableColumn {
  name: string;
  expandedType: string;
  type: TableColumnType;
  comment: string | null;
  defaultValue: any;
  isArray: boolean;
  dimensions: number;
  reference: ColumnReference | null;
  indices: Index[];
  maxLength: number | null;
  isNullable: boolean;
  isPrimaryKey: boolean;
  generated: "ALWAYS" | "NEVER" | "BY DEFAULT";
  isUpdatable: boolean;
  isIdentity: boolean;
  ordinalPosition: number;

  informationSchemaValue: InformationSchemaColumn;
}
```

## details

This parameter represents the table/view/materialized view/composite type that the property belongs to. You may or may not need this, depending on your implementation.

## generateFor

Properties are generated for selectors as well as initializers and mutators. If you want the output property to differ depending on this, use this parameter to decide.

## Output

You should return a value of this type:

```typescript
export type PropertyMetadata = {
  name: string;
  comment: string[] | undefined;
  typeOverride?: TypeDefinition;
  nullableOverride?: boolean;
  optionalOverride?: boolean;
};
```

The `name` field will be the actual name of the property. The default implementation will pass the name through so it matches what you have in the database. As there is a convention for using `snake_case` in Postgres, this will break the Typescript convention of using `camelCase` for properties. If you want to, you could make your interfaces match the Typescript convention, though you will then need to do that conversion when you send and receive values from the database.

The `comment` array will be the comments that go above the property. It will be enclosed in JSDoc style comments: `/** ... */`, so you can use JSDoc syntax and tags to refine documentation.

The three `*Override` values can be set if you want to override the default resolution of whether this property should be nullable or optional, or if you want to override the base type itself.
