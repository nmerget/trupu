import * as jose from 'jose';
import type { Provider, VerifiedIdentity } from '../types.js';
import { githubConfig } from './config.js';

/**
 * GitHub's `job_workflow_ref` looks like:
 *   "owner/repo/.github/workflows/publish.yml@refs/heads/main"
 * We extract just the filename (e.g. "publish.yml").
 */
export function extractWorkflow(jobWorkflowRef: string): string {
  const withoutRef = jobWorkflowRef.split('@')[0];
  return withoutRef.split('/').pop() ?? '';
}

/**
 * Match a ref against a pattern. Supports trailing `*` as wildcard.
 * e.g. "refs/tags/v*" matches "refs/tags/v1.0.0"
 */
export function matchRef(pattern: string, ref: string): boolean {
  if (pattern.endsWith('*')) {
    return ref.startsWith(pattern.slice(0, -1));
  }
  return pattern === ref;
}

export function createGitHubProvider(config = githubConfig): Provider {
  const jwks = jose.createRemoteJWKSet(
    new URL(`${config.issuer}/.well-known/jwks`),
  );

  return {
    async verifyToken(token: string): Promise<VerifiedIdentity> {
      const { payload } = await jose.jwtVerify(token, jwks, {
        issuer: config.issuer,
        audience: config.audience,
      });

      const repository = payload.repository as string;
      const ref = payload.ref as string;
      const jobWorkflowRef = payload.job_workflow_ref as string;
      const workflow = extractWorkflow(jobWorkflowRef);

      if (config.allowedPublishers.length > 0) {
        const match = config.allowedPublishers.some(
          (p) => p.repository === repository && p.workflow === workflow,
        );
        if (!match) {
          throw new Error(
            `publisher "${repository}:${workflow}" is not trusted`,
          );
        }
      }

      if (
        config.allowedRefs.length > 0 &&
        !config.allowedRefs.some((pattern) => matchRef(pattern, ref))
      ) {
        throw new Error(`ref "${ref}" is not allowed`);
      }

      return { repository, workflow, ref };
    },
  };
}
