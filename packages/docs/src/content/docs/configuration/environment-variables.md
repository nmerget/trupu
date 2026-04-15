---
title: Environment Variables
description: All environment variables supported by the trupu server.
---

Configure the trupu server via environment variables on the `trupu` service in your `docker-compose.yml`.

## Server

| Variable | Default | Description                      |
| -------- | ------- | -------------------------------- |
| `PORT`   | `3000`  | Port the trupu server listens on |

## Authentication

| Variable             | Default                        | Description                                                                                                      |
| -------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `ALLOWED_PUBLISHERS` | _(empty)_                      | Comma-separated trusted publishers in `owner/repo:workflow.yml` format                                           |
| `ALLOWED_REFS`       | _(empty)_                      | Comma-separated git refs to allow (e.g. `refs/heads/main`). Empty = allow all                                    |
| `OIDC_AUDIENCE`      | `https://registry.example.com` | Expected `aud` claim in the OIDC token. Must match the `audience` parameter in your GitHub Actions token request |

## Dev mode

| Variable    | Default           | Description                                                    |
| ----------- | ----------------- | -------------------------------------------------------------- |
| `DEV_MODE`  | `false`           | Set to `true` to skip OIDC verification and accept `DEV_TOKEN` |
| `DEV_TOKEN` | `trupu-dev-token` | Static token accepted when `DEV_MODE` is `true`                |

## Example

```yaml
trupu:
  environment:
    PORT: '3000'
    ALLOWED_PUBLISHERS: 'my-org/app:publish.yml,my-org/lib:release.yaml'
    ALLOWED_REFS: 'refs/heads/main,refs/tags/v*'
    OIDC_AUDIENCE: 'https://registry.example.com'
```

:::caution
Never enable `DEV_MODE` in production. It bypasses all OIDC verification.
:::
