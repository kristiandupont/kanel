const { makePgTsGenerator } = require("kanel");
const { makeKyselyHook, kyselyTypeFilter } = require("kanel-kysely");
const { markAsGenerated } = require("kanel/build/hooks/index.js");

const outputPath = "./models";

/** @type {import('kanel/src/config-types-v4.js').ConfigV4} */
module.exports = {
  connection: {
    host: "localhost",
    user: "postgres",
    password: "postgres",
    database: "dvdrental",
    charset: "utf8",
    port: 54321,
  },

  outputPath,
  resolveViews: true,
  preDeleteOutputFolder: true,
  filter: kyselyTypeFilter,

  typescriptConfig: {
    enumStyle: "literal-union",
    tsModuleFormat: "commonjs",
  },

  generators: [
    makePgTsGenerator({
      preRenderHooks: [makeKyselyHook()],
    }),
  ],

  postRenderHooks: [markAsGenerated],
};
