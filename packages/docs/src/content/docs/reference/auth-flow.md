---
title: Auth Flow
description: How trupu authenticates Docker pushes using GitHub Actions OIDC.
---

## Overview

trupu implements the [OpenSSF Trusted Publishers](https://repos.openssf.org/trusted-publishers-for-all-package-repositories) pattern for Docker registries, similar to how npm, PyPI, and RubyGems handle trusted publishing.

## Step-by-step flow

### 1. GitHub Actions requests an OIDC token

The workflow uses the `id-token: write` permission to request a short-lived JWT from GitHub's OIDC provider (`https://token.actions.githubusercontent.com`).

The token contains claims like:

```json
{
  "iss": "https://token.actions.githubusercontent.com",
  "aud": "https://registry.example.com",
  "repository": "my-org/my-app",
  "ref": "refs/heads/main",
  "job_workflow_ref": "my-org/my-app/.github/workflows/publish.yml@refs/heads/main"
}
```

### 2. Docker sends credentials

The workflow passes the OIDC token as the password in `docker login`. Docker encodes it as Basic auth (`oauth2:<token>`) and sends it with every push request.

### 3. Traefik forwards to trupu

Traefik's ForwardAuth middleware intercepts every request to `/v2/*` and sends a GET to `http://trupu:3000/auth` with the original headers.

### 4. trupu verifies the token

trupu:

1. Extracts the token from the `Authorization` header (supports both Basic and Bearer)
2. Verifies the JWT signature against GitHub's JWKS (`https://token.actions.githubusercontent.com/.well-known/jwks`)
3. Validates the `iss` (issuer) and `aud` (audience) claims
4. Extracts `repository` and `workflow` from the token claims
5. Checks if `repository:workflow` matches an entry in `ALLOWED_PUBLISHERS`
6. Optionally checks the `ref` claim against `ALLOWED_REFS`

### 5. Request is proxied or rejected

- **200** — auth succeeded, Traefik proxies the request to the Docker registry
- **401** — no credentials provided, returns `Www-Authenticate: Basic realm="trupu"`
- **403** — token invalid or publisher not trusted

## Response headers

On successful authentication, trupu sets these headers (forwarded by Traefik to the registry):

| Header               | Example           | Description           |
| -------------------- | ----------------- | --------------------- |
| `X-Trupu-Repository` | `my-org/my-app`   | The GitHub repository |
| `X-Trupu-Workflow`   | `publish.yml`     | The workflow filename |
| `X-Trupu-Ref`        | `refs/heads/main` | The git ref           |
