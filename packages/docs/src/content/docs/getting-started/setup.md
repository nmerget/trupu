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

See the [GitHub Actions Workflow](../../reference/github-actions-workflow/) reference for a complete example workflow that pushes images to your trupu-protected registry.

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
