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

  schemas: [
    {
      name: 'public',
      tablesToIgnore: ['knex_migrations', 'knex_migrations_lock'],
      modelFolder: path.join(__dirname, 'src', 'models'),
    },
  ],
};

```
