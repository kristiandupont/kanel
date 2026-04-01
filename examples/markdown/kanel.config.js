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
      /**
       * Custom helpers available to all templates in addition to the built-ins
       * (find, findBy, shortType). This example adds a helper that converts
       * snake_case identifiers to a human-readable Title Case label.
       */
      helpers: {
        label: (value) =>
          String(value)
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
      },

      targets: [
        {
          template: "./docs-src/index.md.hbs",
          output: "./docs/index.md",
        },
        {
          template: "./docs-src/table.md.hbs",
          output: "./docs/tables/{{entity.name}}.md",
          perEntity: true,
          filter: (entity) => entity.type === "table",
        },
        {
          template: "./docs-src/views.md.hbs",
          output: "./docs/views.md",
        },
        {
          template: "./docs-src/functions.md.hbs",
          output: "./docs/functions.md",
        },
      ],
    }),
  ],

  postRenderHooks: [markAsGenerated],
};
