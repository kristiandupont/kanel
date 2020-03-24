const path = require('path');

module.exports = {
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: 'postgres',
    database: 'dvdrental',
    charset: 'utf8',
    port: 54321
  },

  // filenameCasing: 'dash',
  sourceCasing: null,
  preDeleteModelFolder: true,

  customTypeMap: {
    tsvector: 'string',
    bpchar: 'string'
  },

  schemas: [
    {
      name: 'public',
      modelFolder: path.join(__dirname, 'models'),
      ignore: ['film_list', 'staff']
    },
  ],
};
