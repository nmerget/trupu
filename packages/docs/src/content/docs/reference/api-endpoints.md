---
title: API Endpoints
description: HTTP endpoints exposed by the trupu server.
---

## `GET /auth`

The ForwardAuth endpoint. Traefik sends every registry request here for authentication.

### Request

Traefik forwards the original request's headers. trupu reads the `Authorization` header.

Supported schemes:

- `Bearer <oidc-token>` — used by GitHub Actions directly
- `Basic base64(username:token)` — used by `docker login` (the password is the OIDC token)

### Responses

**200 OK** — authenticated

```json
{
  "status": "authenticated",
  "publisher": "my-org/my-app:publish.yml"
}
```

Response headers set:

- `X-Trupu-Repository`
- `X-Trupu-Workflow`
- `X-Trupu-Ref`

**401 Unauthorized** — no credentials

```json
{ "error": "missing authorization header" }
```

Response headers set:

- `Www-Authenticate: Basic realm="trupu"`

**403 Forbidden** — invalid token or untrusted publisher

```json
{ "error": "publisher \"my-org/my-app:other.yml\" is not trusted" }
```

---

## `GET /healthz`

Health check endpoint.

### Response

**200 OK**

```json
{ "status": "ok" }
```
