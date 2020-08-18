# Kanel

Generate Typescript types from a live database

_Works with Postgres databases._

## Usage

Install with:

```
$ npm i -g kanel
```

To run, make sure you are in a folder that has a `.kanelrc.js` configuration file, and type:

```
$ kanel
```

## Configuration

Here is an example configuration file:

```javascript
const path = require('path');

module.exports = {
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: 'postgres',
    database: 'acme',
  },

  filenameCasing: 'dash',
  typeCasing: 'pascal',
  propertyCasing: 'camel',,
  preDeleteModelFolder: true,

  customTypeMap: {
    tsvector: 'string',
    bpchar: 'string',
  },

  schemas: [
    {
      name: 'public',
      ignore: ['knex_migrations', 'knex_migrations_lock'],
      modelFolder: path.join(__dirname, 'src', 'models'),
    },
  ],
};

```

The configuration file contains the following fields:

### `connection` _(Required)_

This is the database connection object. It follows the [`client`](https://node-postgres.com/api/client) constructor in [pg](https://www.npmjs.com/package/pg). As you will typically want to run Kanel on your development machine, you probably want a simple localhost connection as in the example above.

### `filenameCasing`

Specifies how you like your files cased. Can be any of the [recase](https://www.npmjs.com/package/@kristiandupont/recase) options: `dash`, `snake`, `camel` or `pascal`. Default is `pascal` which means your generated files will have filenames that look like this: `UserProfile.ts`.

### `typeCasing`

Specifies what the casing of types (interfaces) should be. If left undefined, they will preserve the casing in the database.

### `propertyCasing`

Specifies the casing of property names. If left undefined, they will preserve the casing in the database.

### `sourceCasing`

Specifies what the casing of your database entities are. This is mostly for edge cases, if left undefined it will typically just work but if you are experiencing trouble, it might help you specifying what the casing of your tables and columns is.

### `preDeleteModelFolder`

Delete the model folder before generating files? Set this to `true` if you want to make sure that there are no deprecated models in your model folder after running Kanel. Defaults to `false`.

### `customTypeMap`

This allows you to specify (or override) which types to map to. Kanel recognizes the most common types and applies the most likely Typescript type to it, but you might want to override this. This map maps from postgres type to typescript type.

### `schemas`

This is an array of schemas to process.
These contain the following fields:

### `schema.name`

Name of the schema.

### `schema.modelFolder`

Folder on disk where the models will be stored. Note that if `preDeleteModelFolder` above is set, this folder will be deleted and recreated when Kanel is run.

### `schema.ignore`

An array of tables and views to ignore. Use this if there are things in your database you don't care to generate models for like migration information etc.

## Example

To see an example of the result, check out the [/example](example) folder. It uses the [Sample Database](https://www.postgresqltutorial.com/postgresql-sample-database/) from www.postgresqltutorial.com.

Kanel will scan tables, views and enum types. It will generate a model type for each table and view. Additionally, it will create an _initializer_ type for tables that aren't tagged `@fixed` in the comment. Initializer types
represent the requirements for creating a new row in the table. Columns that are nullable or have default values are considered optional.

Documentation is extracted from postgres comments on your tables, columns etc., as jsdoc.
For more info about postgres comments, see: https://www.postgresql.org/docs/9.1/sql-comment.html

---

<img src="https://images.unsplash.com/photo-1530991472021-ce0e43475f6e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1350&q=80" />
