const { makeMarkdownGenerator } = require("kanel");
const { markAsGenerated } = require("kanel/build/hooks/index.js");

const outputPath = "./docs";

/** @type {import('kanel/src/config-types.js').Config} */
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

  typescriptConfig: {
    enumStyle: "literal-union",
    tsModuleFormat: "commonjs",
  },

  generators: [
    makeMarkdownGenerator({
      targets: [
        {
          template: "./docs-src/index.md.hbs",
          output: "./docs/index.md",
        },
      ],
    }),
  ],

  postRenderHooks: [markAsGenerated],
};
