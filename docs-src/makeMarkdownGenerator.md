# makeMarkdownGenerator

`makeMarkdownGenerator` generates Markdown documentation directly from your live PostgreSQL schema using [Handlebars](https://handlebarsjs.com/) templates. Because the output is regenerated from the database on every run, the documentation is always in sync with the actual schema.

A common use case is generating a reference that both developers and LLMs can use as context when working with the database.

## Basic Usage

```javascript
const { makeMarkdownGenerator } = require('kanel');
const { markAsGenerated } = require('kanel/build/hooks/index.js');

/** @type {import('kanel').Config} */
module.exports = {
  connection: { host: 'localhost', user: 'postgres', database: 'mydb' },
  outputPath: './docs',
  preDeleteOutputFolder: true,

  generators: [
    makeMarkdownGenerator({
      targets: [
        {
          template: './docs-src/index.md.hbs',
          output: './docs/index.md',
        },
      ],
    }),
  ],

  postRenderHooks: [markAsGenerated],
};
```

## Targets

Each entry in the `targets` array describes one generation task. Three modes are available:

### Single file

Renders one file from the full schema context:

```javascript
{
  template: './docs-src/index.md.hbs',
  output: './docs/index.md',
}
```

### One file per entity (`perEntity`)

Renders one file for each entity (table, view, enum, function, etc.) across all schemas. The `output` path supports Handlebars-style interpolation over `entity.*`:

```javascript
{
  template: './docs-src/table.md.hbs',
  output: './docs/tables/{{entity.name}}.md',
  perEntity: true,
  filter: (entity) => entity.type === 'table',
}
```

### One file per schema (`perSchema`)

Renders one file per schema. The `output` path supports interpolation over `schema.*`:

```javascript
{
  template: './docs-src/schema.md.hbs',
  output: './docs/schemas/{{schema.name}}.md',
  perSchema: true,
}
```

## Template Context

Templates receive a Handlebars context object. The available data depends on the generation mode.

### All modes

| Variable | Type | Description |
| -------- | ---- | ----------- |
| `schemas` | object | Keyed by schema name. Each value has `tables`, `views`, `materializedViews`, `enums`, `domains`, `ranges`, `compositeTypes`, `functions`, `procedures`. |
| `entities` | array | Flat list of all entities across all schemas. Each entry has `type`, `schema`, and `name` in addition to the entity's own fields. |

### `perEntity` mode

| Variable | Type | Description |
| -------- | ---- | ----------- |
| `entity` | object | The specific entity. Has `type` (`"table"`, `"view"`, `"enum"`, etc.), `schema`, and all fields from `extract-pg-schema`. |

### `perSchema` mode

| Variable | Type | Description |
| -------- | ---- | ----------- |
| `schema` | object | The specific schema. Has `name` plus the same fields as entries in `schemas`. |

The entity field shapes come from [extract-pg-schema](https://github.com/kristiandupont/extract-pg-schema). Useful fields for tables include `columns`, `indices`, `checks`, `triggers`, and `securityPolicies`. Each column has `name`, `expandedType`, `type`, `isNullable`, `isPrimaryKey`, `defaultValue`, `references`, and more.

## Built-in Helpers

Three Handlebars helpers are always available:

### `shortType`

Strips the schema prefix from a qualified PostgreSQL type name. Useful for keeping type displays readable:

::: v-pre
```handlebars
{{shortType expandedType}}
{{!-- "pg_catalog.int4" → "int4", "public.my_enum" → "my_enum" --}}
{{!-- Array suffixes are preserved: "pg_catalog.text[]" → "text[]" --}}
```
:::

### `find`

Finds an item in an array by its `name` property:

::: v-pre
```handlebars
{{#find schemas.public.tables "film"}}
  {{! context is the film table }}
  {{#each columns}}...{{/each}}
{{/find}}
```
:::

### `findBy`

Finds an item in an array by an arbitrary key/value pair:

::: v-pre
```handlebars
{{#findBy entity.columns "isPrimaryKey" true}}
  Primary key column: {{name}}
{{/findBy}}
```
:::

## Custom Helpers

Additional helpers can be registered via the `helpers` option and are available to all templates in that generator:

```javascript
makeMarkdownGenerator({
  helpers: {
    // Convert snake_case to Title Case: "film_id" → "Film Id"
    label: (value) =>
      String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
  },
  targets: [ /* ... */ ],
})
```

Then in any template:

::: v-pre
```handlebars
## {{label entity.name}}
```
:::

Built-in helpers (`find`, `findBy`, `shortType`) are always present regardless of what you pass in `helpers`.

## Handlebars Tips

**Use triple-stache for SQL and raw text.** Handlebars HTML-escapes double-stache output by default, which will mangle SQL in `definition`, `defaultValue`, `clause`, and similar fields (turning `=` into `&#x3D;`, `'` into `&#x27;`, etc.). Use triple-stache for raw output:

::: v-pre
```handlebars
{{!-- Wrong: mangles = ' > characters in SQL --}}
{{definition}}

{{!-- Correct: outputs raw text --}}
{{{definition}}}
```
:::

**Use `#each ... else` for optional sections.** Handlebars cannot evaluate array length in an `#if` condition, but `#each` supports an `else` block that renders when the array is empty:

::: v-pre
```handlebars
## Check Constraints
{{#each entity.checks}}- `{{name}}`: `{{{clause}}}`
{{else}}_None_
{{/each}}
```
:::

**Navigate nested loops with `../`.** When iterating references inside a column loop, use `../` to access the parent scope:

::: v-pre
```handlebars
{{#each entity.columns}}
  {{#each references}}
    {{../name}} → {{tableName}}.{{columnName}}
  {{/each}}
{{/each}}
```
:::

## Full Example

The [markdown example](https://github.com/kristiandupont/kanel/tree/main/examples/markdown) in the repository demonstrates a complete documentation setup for the [dvd-rental](https://www.postgresqltutorial.com/postgresql-getting-started/postgresql-sample-database/) sample database. It generates:

- `index.md` — Overview with a Mermaid ER diagram, table list, enum values, and function index
- `tables/{name}.md` — One file per table with columns, foreign keys, indexes, and check constraints
- `views.md` — All views with column sources resolved back to base tables and SQL definitions
- `functions.md` — All functions and procedures with parameters, return types, and SQL definitions

The config for that example:

<<< @/../examples/markdown/kanel.config.js

## API Reference

### `MarkdownGeneratorConfig`

| Option | Type | Description |
| ------ | ---- | ----------- |
| `targets` | `MarkdownTarget[]` | One or more generation tasks. Required. |
| `helpers` | `Record<string, (...args) => any>` | Additional Handlebars helpers for all templates. Optional. |

### `MarkdownTarget`

| Option | Type | Description |
| ------ | ---- | ----------- |
| `template` | `string` | Path to the `.hbs` template file. Required. |
| `output` | `string` | Output file path. Supports `entity.*` / `schema.*` interpolation with Handlebars syntax. Required. |
| `perEntity` | `boolean` | Generate one file per entity. Optional. |
| `perSchema` | `boolean` | Generate one file per schema. Optional. |
| `filter` | `(entity) => boolean` | Filter which entities to generate for (only used with `perEntity`). Optional. |
