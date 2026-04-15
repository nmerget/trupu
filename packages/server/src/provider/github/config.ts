export interface TrustedPublisher {
  repository: string;
  workflow: string;
}

export function parsePublishers(raw: string): TrustedPublisher[] {
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [repository, workflow] = entry.split(':');
      if (!repository || !workflow) {
        throw new Error(
          `invalid publisher format "${entry}", expected "owner/repo:workflow.yml"`,
        );
      }
      return { repository, workflow };
    });
}

export const githubConfig = {
  issuer: 'https://token.actions.githubusercontent.com',
  allowedPublishers: parsePublishers(process.env.ALLOWED_PUBLISHERS ?? ''),
  allowedRefs: (process.env.ALLOWED_REFS ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean),
  audience: process.env.OIDC_AUDIENCE ?? 'https://registry.example.com',
};
