---
title: Deploy to Dokploy
description: How to deploy trupu and a Docker registry on Dokploy.
---

[Dokploy](https://github.com/Dokploy/dokploy) is a self-hosted PaaS that uses Traefik as its built-in reverse proxy. Since Traefik is already running, trupu only needs Docker labels — no extra Traefik config files required.

## Prerequisites

- A running Dokploy instance
- A domain for the registry (e.g. `registry.example.com`) with a DNS `A` record pointing to your Dokploy server's IP address
- A GitHub repository with Actions enabled

## Step 1: Create a Compose project

In the Dokploy dashboard:

1. Go to **Projects** → **Create Project**
2. Give it a name (e.g. `trupu`)
3. Inside the project, click **Create Service** → **Compose**
4. Set the source to **Raw**
5. Copy the contents of [`docker-compose.dokploy.yml`](https://raw.githubusercontent.com/nmerget/trupu/main/docker-compose.dokploy.yml) into the editor

## Step 2: Configure the compose

Replace `registry.example.com` with your actual domain and set your trusted publishers directly in the compose:

```yaml
services:
  trupu:
    image: ghcr.io/nmerget/trupu:latest
    environment:
      PORT: '3000'
      # TODO: Change to your owner/repo:workflow.yml
      ALLOWED_PUBLISHERS: 'your-org/your-repo:publish.yml'
      # TODO: Change to https://your-registry-domain.com
      OIDC_AUDIENCE: 'https://registry.example.com'
    networks:
      - dokploy-network
    labels:
      - traefik.enable=true
      - traefik.http.services.trupu-server.loadbalancer.server.port=3000

  registry:
    image: registry:2
    ports:
      - '127.0.0.1:6000:5000'
    environment:
      REGISTRY_STORAGE_DELETE_ENABLED: 'true'
    volumes:
      - registry-data:/var/lib/registry
    networks:
      - dokploy-network
    labels:
      - traefik.enable=true
      # TODO: Change registry.example.com to your registry domain
      - traefik.http.routers.trupu-registry.rule=Host(`registry.example.com`)
      - traefik.http.routers.trupu-registry.entrypoints=websecure
      - traefik.http.routers.trupu-registry.tls=true
      - traefik.http.routers.trupu-registry.tls.certresolver=letsencrypt
      - traefik.http.routers.trupu-registry.middlewares=trupu-auth
      - traefik.http.routers.trupu-registry.service=trupu-registry-svc
      - traefik.http.services.trupu-registry-svc.loadbalancer.server.port=5000
      # ForwardAuth middleware
      - traefik.http.middlewares.trupu-auth.forwardauth.address=http://trupu:3000/auth
      - traefik.http.middlewares.trupu-auth.forwardauth.authResponseHeaders=X-Trupu-Repository,X-Trupu-Workflow,X-Trupu-Ref,Www-Authenticate

volumes:
  registry-data:

networks:
  dokploy-network:
    external: true
```

The key values to change:

- `Host(\`registry.example.com\`)` — the domain you configured in DNS for the registry
- `OIDC_AUDIENCE` — use `https://` + your registry domain (e.g. `https://registry.example.com`)
- `ALLOWED_PUBLISHERS` — your `owner/repo:workflow.yml`

:::note
The registry has no public port of its own. All external traffic goes through Dokploy's Traefik, which routes requests based on the `Host()` domain. Traefik also handles TLS via Let's Encrypt automatically.
:::

:::caution
Dokploy auto-generates Traefik labels for each service. To avoid conflicts, all Traefik router/service/middleware names in this compose are prefixed with `trupu-`. Make sure to disable Dokploy's built-in domain configuration for this compose project — the labels handle routing directly.
:::

## Step 3: Deploy

Click **Deploy** in Dokploy. This will:

1. Pull the `ghcr.io/nmerget/trupu` image from GitHub Packages
2. Pull the `registry:2` image
3. Connect both services to the `dokploy-network`
4. Register the Traefik labels for routing and ForwardAuth

:::tip
The compose uses the pre-built image `ghcr.io/nmerget/trupu:latest` from GitHub Packages. Pin to a specific version (e.g. `ghcr.io/nmerget/trupu:0.1.0`) for production stability.
:::

Dokploy's Traefik will automatically:

- Route `registry.example.com` to the Docker registry
- Apply the `trupu-auth` ForwardAuth middleware on every request
- Provision a Let's Encrypt TLS certificate for your domain

## Step 4: Configure GitHub Actions

See the [GitHub Actions Workflow](../../reference/github-actions-workflow/) reference for a complete example workflow. Set the `REGISTRY` env variable to your registry domain from Step 2.

## How it works on Dokploy

```
GitHub Actions ──► Traefik (Dokploy) ──► trupu (/auth) ──► Docker Registry
                   TLS + ForwardAuth      OIDC verify        stores images
```

- Dokploy's Traefik handles TLS termination and certificate management
- The `trupu-auth` ForwardAuth middleware intercepts every request to the registry
- trupu verifies the GitHub OIDC token and checks the publisher allow-list
- On success, Traefik proxies the request to the registry

## Compose file reference

The `docker-compose.dokploy.yml` differs from the local development setup:

| Feature | Local (`docker-compose.yml`)  | Dokploy (`docker-compose.dokploy.yml`) |
| ------- | ----------------------------- | -------------------------------------- |
| trupu   | Built from Dockerfile         | Pre-built image from `ghcr.io`         |
| Traefik | Included as a service         | Uses Dokploy's built-in Traefik        |
| Routing | File provider (`traefik/`)    | Docker labels                          |
| TLS     | Self-signed (Traefik default) | Let's Encrypt via Dokploy              |
| Network | Default compose network       | `dokploy-network` (external)           |
| Domain  | `localhost:5000`              | Your custom domain                     |

## Pulling images from the registry

The registry's port 5000 is bound to `127.0.0.1:6000` on the host — accessible from the server itself but not from the internet. External traffic goes through Traefik with OIDC auth, while internal services pull directly via localhost without authentication.

Other Dokploy compose services can pull images using `localhost:6000`:

```yaml
services:
  app:
    image: localhost:6000/my-image:latest
    networks:
      - dokploy-network

networks:
  dokploy-network:
    external: true
```

Add `localhost:6000` to the Docker daemon's insecure registries on your Dokploy server (the registry runs plain HTTP internally).

Edit `/etc/docker/daemon.json`:

```json
{
  "insecure-registries": ["localhost:6000"]
}
```

Then restart Docker:

```bash
sudo systemctl restart docker
```

:::caution
External pulls must go through Traefik at `registry.example.com` and require OIDC authentication.
:::

## Garbage collection

The Docker registry does not automatically clean up deleted image layers. Over time, unreferenced blobs accumulate and waste disk space. Use Dokploy's built-in [Schedule Jobs](https://docs.dokploy.com/docs/core/schedule-jobs) to run [garbage collection](https://distribution.github.io/distribution/about/garbage-collection/) on a schedule.

### Setting up the scheduled job

1. In the Dokploy dashboard, open your trupu **Compose** service
2. Go to the **Schedule Jobs** tab
3. Create a new **Compose Job** targeting the `registry` service
4. Set **Shell Type** to **Sh**
5. Set the command to:

```bash
registry garbage-collect /etc/docker/registry/config.yml --delete-untagged
```

6. Set the cron schedule — for example `0 3 * * *` to run daily at 3 AM
7. Save the job

The `--delete-untagged` flag also removes manifests that are no longer referenced by any tag.

### Dry run

To preview what would be deleted without removing anything, create a separate job or run it once with:

```bash
registry garbage-collect /etc/docker/registry/config.yml --delete-untagged --dry-run
```

Check the job's execution logs in Dokploy to see which blobs are eligible for deletion.

:::caution
Garbage collection is a stop-the-world operation. If an image is being pushed while GC runs, the push may fail or produce a corrupted image. Schedule GC during low-traffic hours.
:::
