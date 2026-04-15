---
title: Setup
description: How to deploy trupu with Docker Compose.
---

## Prerequisites

- Docker and Docker Compose
- A domain or server where you'll host the registry
- A GitHub repository with Actions enabled

## Quick start

Clone the repository:

```bash
git clone https://github.com/nmerget/trupu.git
cd trupu
```

Edit `docker-compose.yml` and set your trusted publishers:

```yaml
trupu:
  environment:
    ALLOWED_PUBLISHERS: 'your-org/your-repo:publish.yml'
    OIDC_AUDIENCE: 'https://registry.example.com'
```

Start the stack:

```bash
docker compose up --build -d
```

This starts three services:

- **Traefik** — reverse proxy with TLS on port 5000
- **trupu** — OIDC auth server (internal, port 3000)
- **Docker Registry** — image storage (internal, port 5000)

## GitHub Actions workflow

In your repository, create `.github/workflows/publish.yml`:

```yaml
name: Publish Image

on:
  push:
    tags: ['v*']

permissions:
  id-token: write
  contents: read

jobs:
  push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Get OIDC token
        id: oidc
        run: |
          TOKEN=$(curl -s -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
            "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=https://registry.example.com" | jq -r .value)
          echo "token=$TOKEN" >> "$GITHUB_OUTPUT"

      - name: Login to registry
        run: echo "${{ steps.oidc.outputs.token }}" | docker login registry.example.com:5000 -u oauth2 --password-stdin

      - name: Build and push
        run: |
          docker build -t registry.example.com:5000/my-image:latest .
          docker push registry.example.com:5000/my-image:latest
```

The `id-token: write` permission is required for GitHub to issue OIDC tokens. The `audience` must match your `OIDC_AUDIENCE` environment variable.

## Local development

Use the dev compose override to test without real OIDC tokens:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Verify the registry is reachable and auth works:

```bash
# Should return 401 (no credentials)
curl -s -o /dev/null -w "%{http_code}" https://localhost:5000/v2/

# Should return 200 (valid dev token)
curl -s -k -u oauth2:trupu-dev-token https://localhost:5000/v2/

# Should return 200 with catalog
curl -s -k -u oauth2:trupu-dev-token https://localhost:5000/v2/_catalog
```

Then push with the static dev token:

```bash
echo "trupu-dev-token" | docker login localhost:5000 -u oauth2 --password-stdin
docker tag alpine:latest localhost:5000/test-org/test-repo:latest
docker push localhost:5000/test-org/test-repo:latest
```

Verify the image was pushed:

```bash
curl -s -k -u oauth2:trupu-dev-token https://localhost:5000/v2/_catalog
# {"repositories":["test-org/test-repo"]}
```

:::tip
Add `localhost:5000` to your Docker daemon's `insecure-registries` if you encounter TLS errors locally.
:::
