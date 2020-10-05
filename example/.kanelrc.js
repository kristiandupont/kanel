const path = require('path');

// This hook will insert the name of the model or type right after the auto-generated warning comment.
const insertNameComment = (lines, src) => {
  const [head, ...tail] = lines;
  return [head, `// Name: ${src.name}`, ...tail];
};

module.exports = {
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: 'postgres',
    database: 'dvdrental',
    charset: 'utf8',
    port: 54321,
  },

  filenameCasing: 'pascal',
  typeCasing: 'pascal',
  preDeleteModelFolder: true,

  customTypeMap: {
    tsvector: 'string',
    bpchar: 'string',
  },

  modelHooks: [insertNameComment],
  typeHooks: [insertNameComment],

  schemas: [
    {
      name: 'public',
      modelFolder: path.join(__dirname, 'models'),
      ignore: ['film_list', 'staff'],
    },
  ],
};
