import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { config } from './config.js';
import { createGitHubProvider } from './provider/github/index.js';

const provider = createGitHubProvider();
const app = createApp(provider, config);

serve({ fetch: app.fetch, port: config.port }, () => {
  console.log(
    `trupu server listening on :${config.port}${config.devMode ? ' [DEV MODE]' : ''}`,
  );
});
