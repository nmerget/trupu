# Trupu

## 0.1.0

### Minor Changes

- [`e8870c2`](https://github.com/nmerget/trupu/commit/e8870c272caf3baeb905ee87f0a0da288218cf6f) Thanks [@nmerget](https://github.com/nmerget)! - Initial release of trupu — Trusted Publishing for Docker registries using GitHub Actions OIDC.
  - Hono-based auth server with Traefik ForwardAuth integration
  - GitHub Actions OIDC token verification via JWKS
  - Trusted publisher format: `owner/repo:workflow.yml`
  - Wildcard ref matching (e.g. `refs/tags/v*`)
  - Dev mode for local testing without real OIDC tokens
  - Support for both Bearer and Basic auth schemes
  - Docker image published to `ghcr.io/nmerget/trupu`
  - Dokploy deployment guide with garbage collection
