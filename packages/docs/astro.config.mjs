// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE,
  base: process.env.BASE,
  integrations: [
    starlight({
      title: 'trupu',
      favicon: '/favicon.ico',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/nmerget/trupu',
        },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'getting-started/introduction' },
            { label: 'Setup', slug: 'getting-started/setup' },
          ],
        },
        {
          label: 'Configuration',
          items: [
            {
              label: 'Environment Variables',
              slug: 'configuration/environment-variables',
            },
            {
              label: 'Trusted Publishers',
              slug: 'configuration/trusted-publishers',
            },
          ],
        },
        {
          label: 'Deployment',
          items: [{ label: 'Deploy to Dokploy', slug: 'deployment/dokploy' }],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Auth Flow', slug: 'reference/auth-flow' },
            { label: 'API Endpoints', slug: 'reference/api-endpoints' },
          ],
        },
      ],
    }),
  ],
});
