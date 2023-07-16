export default {
  title: 'Kanel',
  description: 'Source of Truth: PostgreSQL',
  base: '/kanel/',
  outDir: '../docs/',
  themeConfig: {
    sidebar: [
      {
        text: 'Intro',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'How to work with Kanel', link: '/workflow' },
          { text: 'Data Types', link: '/dataTypes' },
          { text: 'Migrating from V2', link: '/migration' },
        ],
      },
      {
        text: 'Configuration',
        items: [
          {
            text: 'Configuring',
            link: '/configuring',
          },
          {
            text: 'getMetadata',
            link: '/getMetadata',
          },
          { text: 'getPropertyMetadata', link: '/getPropertyMetadata' },
          { text: 'generateIdentifierType', link: '/generateIdentifierType' },
          { text: 'preRenderHooks', link: '/preRenderHooks' },
          { text: 'postRenderHooks', link: '/postRenderHooks' },
        ],
      },
      {
        text: 'Extensions',
        items: [
          { text: 'kanel-knex', link: '/kanel-knex' },
          { text: 'kanel-zod', link: '/kanel-zod' },
          { text: 'kanel-kysely', link: '/kanel-kysely' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/kristiandupont/kanel' },
    ],
  },
};
