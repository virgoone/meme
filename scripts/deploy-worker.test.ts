import { describe, expect, test } from 'bun:test';
import {
  uploadedVersion,
  verifyUploadedVersion,
  verifyDeployment,
} from './deploy-worker.mjs';

const id = '11111111-2222-3333-4444-555555555555';
const sha = 'a'.repeat(40);
const message = `GitHub main ${sha}`;
const success = `Worker Version ID: ${id}\n`;
const previewError =
  '[ERROR] A request to the Cloudflare API (/accounts/test-account/workers/subdomain) failed.\nAuthentication error [code: 10000]';

describe('production version verification', () => {
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
