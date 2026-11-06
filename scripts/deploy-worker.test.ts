import { describe, expect, test } from 'bun:test';
import {
  uploadedVersion,
  verifyUploadedVersion,
  verifyDeployment,
  verifyRuntimeBindings,
} from './deploy-worker.mjs';

const id = '11111111-2222-3333-4444-555555555555';
const sha = 'a'.repeat(40);
const message = `GitHub main ${sha}`;
const success = `Worker Version ID: ${id}\n`;
const previewError =
  '[ERROR] A request to the Cloudflare API (/accounts/test-account/workers/subdomain) failed.\nAuthentication error [code: 10000]';

describe('production version verification', () => {
  test('rejects inherited maintenance flags, D1 bindings and missing production secrets before deployment', () => {
    const bindings = [
      { name: 'DATABASE_PROVIDER', type: 'plain_text', text: 'libsql' },
      { name: 'TURSO_DB_URL', type: 'plain_text', text: 'libsql://meme-moss.aws-ap-northeast-1.turso.io' },
      { name: 'TURSO_DB_AUTH_TOKEN', type: 'secret_text' },
      { name: 'BETTER_AUTH_SECRET', type: 'secret_text' },
    ];
    const version = (entries: typeof bindings) => ({ resources: { bindings: entries } });
    expect(() => verifyRuntimeBindings(version(bindings))).not.toThrow();
    expect(() => verifyRuntimeBindings(version([...bindings, { name: 'DATABASE_MIGRATION_READ_ONLY', type: 'plain_text', text: '1' }]))).toThrow('maintenance');
    expect(() => verifyRuntimeBindings(version([...bindings, { name: 'DB', type: 'd1' }]))).toThrow('D1');
    for (const required of bindings) {
      expect(() => verifyRuntimeBindings(version(bindings.filter(entry => entry !== required)))).toThrow();
    }
    expect(() => verifyRuntimeBindings(version(bindings.map(entry => entry.name === 'TURSO_DB_URL' ? { ...entry, text: 'libsql://wrong.turso.io' } : entry)))).toThrow('database');
  });
  test('accepts an uploaded version and the known preview-only permission failure', () => {
    expect(uploadedVersion(success, 0, 'test-account')).toBe(id);
    expect(uploadedVersion(success + previewError, 1, 'test-account')).toBe(id);
  });
  test('fails closed on missing upload, other API errors, and multiple errors', () => {
    expect(() => uploadedVersion(previewError, 1, 'test-account')).toThrow();
    expect(() =>
      uploadedVersion(
        success +
          previewError.replace(
            '/workers/subdomain',
            '/workers/scripts/meme/versions',
          ),
        1,
        'test-account',
      ),
    ).toThrow();
    expect(() =>
      uploadedVersion(
        success + previewError + '\n[ERROR] upload failed',
        1,
        'test-account',
      ),
    ).toThrow();
    expect(() =>
      uploadedVersion(success + previewError, 1, 'different-account'),
    ).toThrow();
    expect(() =>
      uploadedVersion(success + 'Network failure', 1, 'test-account'),
    ).toThrow();
  });
  test('requires Cloudflare to confirm the exact uploaded commit and version', () => {
    const version = {
      id,
      annotations: { 'workers/message': message, 'workers/tag': sha },
    };
    expect(() =>
      verifyUploadedVersion(version, id, message, sha),
    ).not.toThrow();
    expect(() =>
      verifyUploadedVersion(version, 'different', message, sha),
    ).toThrow();
    expect(() =>
      verifyUploadedVersion(version, id, 'stale commit', sha),
    ).toThrow();
    expect(() =>
      verifyUploadedVersion(version, id, message, 'b'.repeat(40)),
    ).toThrow();
  });
  test('rejects stale and partial production deployments', () => {
    expect(() =>
      verifyDeployment({ versions: [{ version_id: id, percentage: 100 }] }, id),
    ).not.toThrow();
    expect(() =>
      verifyDeployment(
        { versions: [{ version_id: 'old-version', percentage: 100 }] },
        id,
      ),
    ).toThrow();
    expect(() =>
      verifyDeployment({ versions: [{ version_id: id, percentage: 50 }] }, id),
    ).toThrow();
    expect(() => verifyDeployment({ versions: [] }, id)).toThrow();
  });
});
