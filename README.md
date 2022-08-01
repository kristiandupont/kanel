# Kanel

Generate Typescript types from a live Postgres database.

This is for people who don't like ORM's but who do like intellisense and type checking for their database access code.
The recommended process is:

1. Create a migration using Knex or regular SQL.
2. Run the migration on your local development database.
3. Run Kanel on your dev database. It will create/update your type definitions.
4. Review them, and compile your code. When everything works, commit the migration together with the updated type definitions and other changes.

Introduction to the idea is outlined [here](https://medium.com/@kristiandupont/generating-typescript-types-from-postgres-48661868ef84).

## Linting

When using the database as the source of truth, you want to perform your linter checks on the structure of the database, i.e. the schema. For that, you can use [schemalint](https://github.com/kristiandupont/schemalint) which is a linter for Postgres schemas.

As for the generated code, it will contain a `@generated` tag which is a semi-standard that a number of tools respect. You can use [eslint-plugin-ignore-generated](https://github.com/zertosh/eslint-plugin-ignore-generated) to ignore these files.

## Usage

Install with:

```
$ npm i -D kanel
```

or

```
$ yarn add --dev kanel
```

To run, make sure you are in a folder that has a `.kanelrc.js` configuration file and that your database is running, and type:

```
$ npx kanel
```

or

```
$ yarn kanel
```

## Programmatically usage

Example of running generation from code:

```typescript
import { processDatabase } from 'kanel';
import config from './kanelrc';

async function run() {
  await processDatabase(config);
}

void run();
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

`connection` _(Required)_

This is the database connection object. It follows the [`client`](https://node-postgres.com/api/client) constructor in [pg](https://www.npmjs.com/package/pg). As you will typically want to run Kanel on your development machine, you probably want a simple localhost connection as in the example above.

`preDeleteModelFolder`

Delete the model folder before generating files? Set this to `true` if you want to make sure that there are no deprecated models in your model folder after running Kanel. Defaults to `false`.

`customTypeMap`

This allows you to specify (or override) which types to map to. Kanel recognizes the most common types and applies the most likely Typescript type to it, but you might want to override this. This map maps from postgres type to typescript type.
The values in this map can either be a simple string, in which case it's assumed to be a built-in type (like `string`), or it can be an object of the following type:

```
type ImportedType = {
  name: string;
  module: string;
  absoluteImport: boolean;
  defaultImport: boolean;
};
```

In this case, you specify a name and a module to import the type from. If the module is an absolute import (i.e. listed in your `package.json` file), set `absoluteImport` to true. If it's set to false, it will represent a path relative to the `externalTypesFolder` if one is supplied, or a path relative to the model file itself if not. The final property, `defaultImport` specifies whether the type should be imported as the default from the module, or, if false, as a named import.

`modelHooks`

If you need to perform some modification of any or all of the models before writing the files, you can do so with a hook. The `modelHooks` property can be an array of functions that can modify the contents. They should have the following signature: `(lines: string[], src: Model) => string[]`. The first argument is the array of strings that represent the lines in the file. The second is the model as returned from `extract-pg-schema` -- you can see an example [here](https://github.com/kristiandupont/extract-pg-schema#table).

`modelNominator`

A function (`(modelName: string) => string`) that converts a table or view name into an interface name. If, say, you use `snake_casing` for your database entities, but prefer `PascalCasing` for your interfaces, you can give this a function that makes such a conversion (the [recase](https://www.npmjs.com/package/@kristiandupont/recase) library will help you with this if you want -- see the example folder).

`propertyNominator`

A function (`(propertyName: string, model: Model) => string`) that converts the name of a column to a property name. The model (table or view) that it belongs to is passed as the second parameter in case you should need it.

`initializerNominator`

A function (`(givenName: string, modelName: string) => string`) that converts a table or view name into the initializer name. The first parameter is the name that was produced by the model nominator, and the second parameter is the original, unprocessed name. This defaults to a function that appends `Initializer` to the name.

`idNominator`

A function (`(givenName: string, modelName: string) => string`) that converts a table or view name into the identifier name. The first parameter is the name that was produced by the model nominator, and the second parameter is the original, unprocessed name. This defaults to a function that appends `Id` to the name.

`typeHooks`

Like the `modelHooks` property, this property can specify a number of hooks to attach to generation of type (enum or composite) files. They have the same signature, only the `src` parameter is a [type](https://github.com/kristiandupont/extract-pg-schema#type) object.

`typeNominator`

A function (`(modelName: string) => string`) that converts a custom postgres type (enum or composite) name into a type name.

`fileNominator`

A function `(givenName: string, originalName: string)` that converts the name of a table, view or type into the corresponding file name. _NOTE_ this should return a string with no `.ts` extension, as it's used in `import` statements as well.

`resolveViews`

Since the reflection capabilities in Postgres are slightly limited when it comes to views, the generated models will not per default reflect things like nullable and references to other models. If you set this value to true, Kanel will attempt to parse the view definitions to figure out where the columns in the view stem from, and use those "source" columns for this information.

`schemas` _(Required)_

This is an array of schemas to process.
These contain the following fields:

`schema.name` _(Required)_

Name of the schema.

`schema.modelFolder` _(Required)_

Folder on disk where the models will be stored. Note that if `preDeleteModelFolder` above is set, this folder will be deleted and recreated when Kanel is run.

`schema.ignore`

An array of tables and views to ignore. Use this if there are things in your database you don't care to generate models for like migration information etc.
Each item in the array can be either a string, a regular expression, or a function. If it's a string, it's assumed to be a table or view name. If it's a regular expression, it's matched against the table or view name. If it's a function, it's called with the table or view name as the first parameter and should return true if the table or view should be ignored.

`schema.externalTypesFolder`

This will specify the folder to look for external types from. If you tag a column like this: `@type:Vector`, Kanel will use that as the type for the property and import that from a file by the same name in said folder.

## Example

To see an example of the result, check out the [/example](example) folder. It uses the [Sample Database](https://www.postgresqltutorial.com/postgresql-sample-database/) from www.postgresqltutorial.com.

Kanel will scan tables, views, composite and enum types. It will generate a model type for each table and view. Additionally, it will create an _initializer_ type for tables that aren't tagged `@fixed` in the comment. Initializer types
represent the requirements for creating a new row in the table. Columns that are nullable or have default values are considered optional.

Documentation is extracted from postgres comments on your tables, columns etc., as jsdoc.
For more info about postgres comments, see: https://www.postgresql.org/docs/9.1/sql-comment.html

---

<img src="https://images.unsplash.com/photo-1530991472021-ce0e43475f6e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1350&q=80" />

---

## Contributors

<a href="https://github.com/kristiandupont/kanel/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=kristiandupont/kanel" />
</a>

Made with [contrib.rocks](https://contrib.rocks).
