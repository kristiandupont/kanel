# getMetadata

```typescript
getMetadata?: (
  details: Details,
  generateFor: 'selector' | 'initializer' | 'mutator' | undefined,
  config: InstantiatedConfig
) => TypeMetadata;
```

This function will give Kanel the information it needs to create types from database items. There is a default implementation provided in [default-metadata-generators.ts](https://github.com/kristiandupont/kanel/blob/master/src/default-metadata-generators.ts) which you can either use as is, as inspiration or you can write your own and call the default as a fallback if you want most cases to work like the default but with a few changes.

## details

The `details` parameter describes the item that is being processed. It always has the following properties:

- `kind`: the "metatype" of the item. Can be either `table`, `view`, `materializedView`, `compositeType`, `domain`, `range` or `enum`.
- `name`: the name of the item.
- `schemaName`: the name of the schema that the item is defined in.
- `comment`: a string containing the [comment](https://www.postgresql.org/docs/current/sql-comment.html) for the item in the database.

The `details` parameter will have additional properties based on what the `kind` property is. To explore this further, look at the [extract-pg-schema](https://github.com/kristiandupont/extract-pg-schema) repository. Here is a summary of the important fields:

### Table

When `kind` === `'table'`, `details` will have the following properties:

- `columns: TableColumn[];`
- `informationSchemaValue: InformationSchemaTable;`

Every column is represented by the `TableColumn` which in turn is defined like this:

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

And the following supporting types:

```typescript
export type UpdateAction =
  | 'NO ACTION',
  | 'RESTRICT',
  | 'CASCADE',
  | 'SET NULL',
  | 'SET DEFAULT',

export type ColumnReference = {
  schemaName: string;
  tableName: string;
  columnName: string;
  onDelete: UpdateAction;
  onUpdate: UpdateAction;
};

export type Index = {
  name: string;
  isPrimary: boolean;
};

export type TableColumnType = {
  fullName: string;
  kind: 'base' | 'range' | 'domain' | 'composite' | 'enum';
};
```

Now, both the table and columns have a field called `informationSchemaValue`. This represents the values extracted from the [information schema](https://en.wikipedia.org/wiki/Information_schema).

Most of the properties should be self-explanatory, but the following might require a bit of explanation:

- `type`: An object with more description. The `fullName` property is the concatenated schema name and object name with a dot.
- `dimensions`: number representing the dimensionality of the column. If 0, it's just the value, if 1, it's an array, 2 is an array of arrays and so on.
- `reference`: If the column has a foreign key relation to another column, this will describe that, as well as what Postgres will do when it's updated or deleted.

### View

When `kind` is `'view'`, you get almost the same as for tables:

- `columns: ViewColumn[];`
- `definition: string;`
- `informationSchemaValue: InformationSchemaView;`

The `definition` field contains the sql code that defines the view. The columns are defined like this:

```typescript
export interface ViewColumn {
  name: string;
  expandedType: string;
  type: ViewColumnType;
  comment: string | null;
  defaultValue: any;
  isArray: boolean;
  maxLength: number | null;
  generated: "ALWAYS" | "NEVER" | "BY DEFAULT";
  isUpdatable: boolean;
  isIdentity: boolean;
  ordinalPosition: number;

  /**
   * This will contain a "link" to the source table or view and column,
   * if it can be determined.
   */
  source: { schema: string; table: string; column: string } | null;

  /**
   * If views are resolved, this will contain the reference from the source
   * column in the table that this view references. Note that if the source
   * is another view, that view in turn will be resolved if possible, leading
   * us to a table in the end.
   */
  reference?: ColumnReference | null;
  indices?: Index[];
  isNullable?: boolean;
  isPrimaryKey?: boolean;

  informationSchemaValue: InformationSchemaColumn;
}
```

### Materialized View

When `kind` is `'materializedView'`, the result is pretty much the same as for the previous two. One important difference is that since materialized views aren't an SQL standard, there is no official information schema value for it. However, extract-pg-schema attempts to recreate the values which you can access in the `fakeInformationSchemaValue` field.

So the contents are:

- `columns: MaterializedViewColumn[];`
- `definition: string;`
- `fakeInformationSchemaValue: InformationSchemaView;`

### Composite Type

When `kind` is `compositeType`, the result is similar to tables, views and materialized views. This is because composite types are much like tables in their definition.

## generateFor

When generating metadata for a type that has properties (table, view, materialized view or composite type), this value will be set to either `selector`, `initializer` or `mutator`.

For any table etc., Kanel can generate a selector which is the "primary" type that will be returned from a `select *` statement. Initializers are used when inserting a new row -- which basically means that columns that are nullable or have default values are marked as optional as you can initialize such a row without specifying said property. Finally, mutators are what you use in `update` statements, where any property is optional.

## Output

The `TypeMetadata` type that your function should return is defined like this:

```typescript
export type TypeMetadata = {
  name: string;
  comment: string[] | undefined;
  path: string;
};
```

The `name` field is used as the name of the type/interface that is generated. So if you for instance have a convention of using `snake_case` for database object names and want to stick with Typescript standard `PascalCase` for your types, you can set this to the converted value of the `details.name` input parameter, using a library like [Recase](https://github.com/kristiandupont/recase/).

The `comment` field is an optional array of strings. These will go above the type definition as JSDoc comments. I.e. if you return the following: `comment = ['Address of a member', '@deprecated Use {@link MemberInfo} instead']`, the generated type definition will look like this:

```typescript
/**
 * Address of a member
 * @deprecated Use {@link MemberInfo} instead
 */
interface MemberAddress {
  // ...
```

You may want to use the incoming `details.comment` string here.

The `path` field tells Kanel where (i.e. in which file) to place the type. Note that this field should _not_ include the `.ts` extension which is added automatically. The reason for this is that this field is also used for generating imports and those should not include extensions.
