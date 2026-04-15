export const config = {
  port: Number(process.env.PORT ?? 3000),
  devMode: process.env.DEV_MODE === 'true',
  devToken: process.env.DEV_TOKEN ?? 'trupu-dev-token',
};
