export default {
  title: "Kanel",
  description: "Source of Truth: PostgreSQL",
  base: "/kanel/",
  outDir: "../docs/",
  themeConfig: {
    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "Getting Started", link: "/getting-started" },
          { text: "How to Work with Kanel", link: "/workflow" },
          { text: "Data Types", link: "/dataTypes" },
          { text: "Migration Guide", link: "/migration" },
        ],
      },
      {
        text: "Core Configuration",
        items: [
          { text: "Overview", link: "/configuring" },
          { text: "useKanelContext", link: "/useKanelContext" },
          { text: "preRenderHooks", link: "/preRenderHooks" },
          { text: "postRenderHooks", link: "/postRenderHooks" },
        ],
      },
      {
        text: "MarkdownGenerator",
        items: [
          { text: "makeMarkdownGenerator", link: "/makeMarkdownGenerator" },
        ],
      },
      {
        text: "PgTsGenerator",
        items: [
          { text: "getMetadata", link: "/getMetadata" },
          { text: "getPropertyMetadata", link: "/getPropertyMetadata" },
          { text: "generateIdentifierType", link: "/generateIdentifierType" },
          { text: "getRoutineMetadata", link: "/getRoutineMetadata" },
        ],
      },
      {
        text: "Extensions",
        items: [
          { text: "kanel-knex", link: "/kanel-knex" },
          { text: "kanel-zod", link: "/kanel-zod" },
          { text: "kanel-kysely", link: "/kanel-kysely" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/kristiandupont/kanel" },
    ],
  },
};
