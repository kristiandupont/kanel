const { 
  makeKyselyHook, 
} = require('../build/index');
const { recase } = require('@kristiandupont/recase');
const {resolveType} = require('kanel')
const outputPath = './example/models';
const toPascalCase = recase('snake', 'pascal');

/** @type {import('../../kanel/src/config-types').Config} */
module.exports = {
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: 'postgres',
    database: 'dvdrental',
    charset: 'utf8',
    port: 54321,
  },
  outputPath,
  resolveViews: true,
  preDeleteOutputFolder: true,
  enumStyle: 'type',
  preRenderHooks: [makeKyselyHook()],
  // comment the generateIdentifierType function if you want the default behavior, adding branded ids
  generateIdentifierType: (c, d, config) => {
    // Id columns are already prefixed with the table name, so we don't need to add it here
    const name = toPascalCase(c.name);
    const innerType = resolveType(c, d, {
      ...config,
      generateIdentifierType: undefined,
    });
    return {
      declarationType: 'typeDeclaration',
      name,
      exportAs: 'named',
      typeDefinition: [innerType],
      comment: [] 
    };
  },
  customTypeMap: {
    'pg_catalog.tsvector': 'Set<string>',
    'pg_catalog.int4': 'number',
    'pg_catalog.bytea': 'string',
    'pg_catalog.json': 'string',
    'pg_catalog.jsonb': 'string',
    'pg_catalog.bpchar': 'string',
    'pg_catalog.bytea': { name: 'bytea', typeImports: [{ name: 'bytea', path: 'bytea', isAbsolute: true, isDefault: true }] },
    'public.citext': 'string'
  },
};
