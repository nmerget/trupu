---
title: Trusted Publishers
description: How to configure which GitHub repositories and workflows can push images.
---

## Format

Trusted publishers are defined using the `ALLOWED_PUBLISHERS` environment variable. Each entry follows the format:

```
owner/repo:workflow.yml
```

Multiple entries are comma-separated:

```
ALLOWED_PUBLISHERS="my-org/frontend:deploy.yml,my-org/backend:publish.yaml"
```

## How matching works

When a GitHub Actions workflow pushes an image, the OIDC token contains a `job_workflow_ref` claim like:

```
my-org/frontend/.github/workflows/deploy.yml@refs/heads/main
```

trupu extracts:

- **repository**: `my-org/frontend` (from the `repository` claim)
- **workflow**: `deploy.yml` (filename from `job_workflow_ref`)

Both must match an entry in `ALLOWED_PUBLISHERS` for the push to be authorized.

## Restricting by ref

Optionally restrict which git refs (branches/tags) are allowed:

```
ALLOWED_REFS="refs/heads/main,refs/tags/v*"
```

When empty (default), any ref is accepted.

## Security considerations

- Always specify the exact workflow filename — this prevents other workflows in the same repo from pushing
- Use `ALLOWED_REFS` to restrict pushes to release branches or tags
- Each trusted publisher entry is an AND condition: both repository and workflow must match
- The OIDC token is verified against GitHub's JWKS endpoint, ensuring it was issued by GitHub and hasn't been tampered with
