# Getting started

If you have a Postgres server running locally with a database called, say, `acme`, you can run Kanel by simply typing:

```bash
$ npx kanel -d postgresql://localhost:5432/acme -o ./src/models
```

This will create a folder called `src/models` and generate a typescript file for each table in the database in said folder.
This is a way to try things out quickly to get a sense of what Kanel can do with your databse.

However, you will probably want to install Kanel as a devDependency in the project where you will be using it.

```bash
$ npm i -D kanel
```

..and then create a configuration file, typically called `.kanelrc.js`. Here is an example of such a file:

```javascript
const path = require('path');

/** @type {import('kanel').Config} */
module.exports = {
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: 'postgres',
    database: 'acme',
  },

  preDeleteModelFolder: true,
  outputPath: './src/schemas',

  customTypeMap: {
    tsvector: 'string',
    bpchar: 'string',
  },
};
```

Once you have that, you can run Kanel without any parameters:

```bash
$ npx kanel
```

The [configuration](./configuring.md) section has details on how to configure Kanel.

---
