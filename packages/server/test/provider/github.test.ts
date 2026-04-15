import { describe, it, expect } from 'vitest';
import { parsePublishers } from '../../src/provider/github/config.js';
import { extractWorkflow, matchRef } from '../../src/provider/github/index.js';

describe('parsePublishers', () => {
  it('parses a single publisher', () => {
    expect(parsePublishers('my-org/repo:publish.yml')).toEqual([
      { repository: 'my-org/repo', workflow: 'publish.yml' },
    ]);
  });

  it('parses multiple publishers', () => {
    expect(parsePublishers('org/a:deploy.yml, org/b:release.yaml')).toEqual([
      { repository: 'org/a', workflow: 'deploy.yml' },
      { repository: 'org/b', workflow: 'release.yaml' },
    ]);
  });

  it('returns empty array for empty string', () => {
    expect(parsePublishers('')).toEqual([]);
  });

  it('trims whitespace', () => {
    expect(parsePublishers('  org/repo:ci.yml  ')).toEqual([
      { repository: 'org/repo', workflow: 'ci.yml' },
    ]);
  });

  it('throws on invalid format (missing workflow)', () => {
    expect(() => parsePublishers('org/repo')).toThrow(
      'invalid publisher format',
    );
  });
});

describe('extractWorkflow', () => {
  it('extracts filename from job_workflow_ref', () => {
    expect(
      extractWorkflow(
        'my-org/repo/.github/workflows/publish.yml@refs/heads/main',
      ),
    ).toBe('publish.yml');
  });

  it('handles refs/tags', () => {
    expect(
      extractWorkflow(
        'org/app/.github/workflows/release.yaml@refs/tags/v1.0.0',
      ),
    ).toBe('release.yaml');
  });

  it('returns empty string for empty input', () => {
    expect(extractWorkflow('')).toBe('');
  });
});

describe('matchRef', () => {
  it('matches exact ref', () => {
    expect(matchRef('refs/heads/main', 'refs/heads/main')).toBe(true);
  });

  it('rejects non-matching exact ref', () => {
    expect(matchRef('refs/heads/main', 'refs/heads/develop')).toBe(false);
  });

  it('matches wildcard prefix', () => {
    expect(matchRef('refs/tags/v*', 'refs/tags/v1.0.0')).toBe(true);
    expect(matchRef('refs/tags/v*', 'refs/tags/v2.3.1')).toBe(true);
  });

  it('rejects non-matching wildcard', () => {
    expect(matchRef('refs/tags/v*', 'refs/heads/main')).toBe(false);
  });

  it('matches bare wildcard', () => {
    expect(matchRef('*', 'refs/heads/anything')).toBe(true);
  });
});
