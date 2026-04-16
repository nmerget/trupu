---
title: GitHub Actions Workflow
description: Example workflow for pushing Docker images to your trupu-protected registry.
---

To push images from GitHub Actions, your workflow needs to request an OIDC token and use it to authenticate with the registry.

Create `.github/workflows/publish.yml` in your repository:

```yaml
name: Publish Image

on:
  push:
    tags: ['v*']

permissions:
  id-token: write
  contents: read

env:
  # TODO: Change to your registry domain
  REGISTRY: registry.example.com
  # TODO: Change to your image name
  IMAGE_NAME: my-image

jobs:
  push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Get OIDC token
        id: oidc
        run: |
          TOKEN=$(curl -s -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
            "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=https://${{ env.REGISTRY }}" | jq -r .value)
          echo "token=$TOKEN" >> "$GITHUB_OUTPUT"

      - name: Login to registry
        run: echo "${{ steps.oidc.outputs.token }}" | docker login ${{ env.REGISTRY }} -u oauth2 --password-stdin

      - name: Build and push
        run: |
          docker build -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest .
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
```

## Key points

- `id-token: write` — required for GitHub to issue OIDC tokens
- `REGISTRY` — your registry domain (e.g. `registry.example.com`), no `https://` prefix
- `IMAGE_NAME` — the image name under the registry (e.g. `my-app`)
- `audience` — must match your `OIDC_AUDIENCE` environment variable on the trupu server, including the `https://` prefix
- The workflow filename (e.g. `publish.yml`) must match the workflow part of your `ALLOWED_PUBLISHERS` config

:::caution
The `audience` parameter in the OIDC token request must exactly match your `OIDC_AUDIENCE` environment variable. A mismatch will result in a 403 error.
:::
