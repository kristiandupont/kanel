# Kanel

Generate Typescript types from your database

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

Here is an example configuration file:
```javascript
const path = require('path');

module.exports = {
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: 'postgres',
    database: 'acme',
    charset: 'utf8',
  },

  filenameCasing: 'dash',
  sourceCasing: 'snake',
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

To see an example of the result, check out the [/example](example) folder. It uses the [Sample Database](https://www.postgresqltutorial.com/postgresql-sample-database/) from www.postgresqltutorial.com.

Kanel will scan tables, views and enum types. It will generate a model type for each table and view. Additionally, it will create an _initializer_ type for tables that aren't tagged `@fixed` in the comment. Initializer types
represent the requirements for creating a new row in the table. Columns that are nullable or have default values are considered optional.

Documentation is extracted from postgres comments on your tables, columns etc., as jsdoc.
For more info about postgres comments, see: https://www.postgresql.org/docs/9.1/sql-comment.html

-----

<img src="https://images.unsplash.com/photo-1530991472021-ce0e43475f6e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1350&q=80" />
