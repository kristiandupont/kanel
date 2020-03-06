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
  preDeleteModelFolder: true,

  schemas: [
    {
      name: 'public',
      modelFolder: path.join(__dirname, 'models'),
    },
  ],
};
