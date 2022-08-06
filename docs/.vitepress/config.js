export default {
  title: 'Kanel',
  description: 'Just playing around.',
  themeConfig: {
    sidebar: [
      {
        text: 'Intro',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'How to work with Kanel', link: '/workflow' },
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
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/kristiandupont/kanel' },
    ],
  },
};
