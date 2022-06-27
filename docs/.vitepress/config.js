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
            text: 'Nominators and Comment Generators',
            link: '/nominators-and-comment-generators',
          },
          { text: 'Hooks', link: '/hooks' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/kristiandupont/kanel' },
    ],
  },
};
