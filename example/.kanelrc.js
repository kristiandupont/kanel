const { join } = require('path');
const { recase } = require('@kristiandupont/recase');
const { tryParse } = require('tagged-comment-parser')

const toPascalCase = recase('snake', 'pascal');
const outputPath = './example/models';

/** @type {import('../src/Config').default} */
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

  getMetadata: (details, generateFor) => {
    const { comment: strippedComment } = tryParse(details.comment);
    const isAgentNoun = ['initializer', 'mutator'].includes(generateFor);

    const relationComment = isAgentNoun
      ? `Represents the ${generateFor} for the ${details.kind} ${details.schemaName}.${details.name}`
      : `Represents the ${details.kind} ${details.schemaName}.${details.name}`;

    const suffix = isAgentNoun ? `_${generateFor}` : '';

    return {
      name: toPascalCase(details.name + suffix),
      comment: [relationComment, ...(strippedComment ? [strippedComment] : [])],
      path: join(outputPath, toPascalCase(details.name)),
    };
  },

  generateIdentifierType: (c, d) => {
    // Id columns are already prepended with the table name, so we don't need to add it here
    const name = toPascalCase(c.name);

    // Identifiers in the example database are all int4's.
    const innerType = 'number'; 
    
    return {
      declarationType: 'typeDeclaration',
      name,
      exportAs: 'named',
      typeDefinition: [`${innerType} & { __flavor?: '${name}' }`],
      comment: [`Identifier type for ${d.name}`],
    };
  },

  customTypeMap: {
    // A text search vector could be stored as a set of strings. See Film.ts for an example.
    'pg_catalog.tsvector': 'Set<string>',

    // The bytea package (https://www.npmjs.com/package/postgres-bytea) could be used for byte arrays.
    // See Staff.ts for an example.
    'pg_catalog.bytea': { name: 'bytea', path: 'bytea', isAbsolute: true, isDefault: true },

    // Columns with the following types would probably just be strings in TypeScript.
    'pg_catalog.bpchar': 'string',
    'public.citext': 'string'
  },
};
