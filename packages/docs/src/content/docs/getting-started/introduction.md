---
title: Introduction
description: Learn what trupu is and how it works.
---

**trupu** is a lightweight authentication server that enables [Trusted Publishing](https://repos.openssf.org/trusted-publishers-for-all-package-repositories) for private Docker registries using GitHub Actions [OpenID Connect (OIDC)](https://openid.net/developers/how-connect-works/).

## The problem

Pushing Docker images from CI to a private registry typically requires storing long-lived credentials as secrets. These tokens can be leaked, require manual rotation, and are hard to scope.

## How trupu solves it

trupu sits between [Traefik](https://traefik.io/) and your [Docker registry](https://hub.docker.com/_/registry) as a ForwardAuth middleware. When a GitHub Actions workflow pushes an image:

1. The workflow requests a short-lived OIDC token from GitHub
2. Docker sends the token as credentials when pushing
3. Traefik forwards the request to trupu's `/auth` endpoint
4. trupu verifies the token against GitHub's JWKS and checks the `repository` and `workflow` claims against your allow-list
5. On success, the request is proxied to the registry

No static tokens. No secrets to rotate. Only the specific `owner/repo:workflow.yml` you've trusted can push.

## Architecture

```
GitHub Actions ──► Traefik (:5000) ──► trupu (/auth) ──► Docker Registry (:5000)
                   ForwardAuth          OIDC verify        stores images
```

All three services run on the same Docker network.

## When to use it

- You run a self-hosted Docker registry
- You want to push images from GitHub Actions without storing registry credentials
- You want workflow-level access control (not just repo-level)
