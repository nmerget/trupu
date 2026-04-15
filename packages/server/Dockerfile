FROM node:24-alpine AS base

FROM base AS builder
RUN corepack enable pnpm
WORKDIR /app

COPY packages/server/package.json packages/server/esbuild.config.js ./
RUN pnpm install
COPY packages/server/src ./src
RUN pnpm build

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 trupu

COPY --from=builder --chown=trupu:nodejs /app/dist/index.js ./index.js

USER trupu
EXPOSE 3000

CMD ["node", "/app/index.js"]
