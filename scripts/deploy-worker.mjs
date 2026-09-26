import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { stripVTControlCharacters } from 'node:util';

export function uploadedVersion(output, status, accountId) {
  const text = stripVTControlCharacters(output);
  const id = text.match(
    /Worker Version ID: ([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\b/i,
  )?.[1];
  assert.ok(id, 'Wrangler did not report an uploaded version');
  if (status !== 0) {
    // Wrangler 4.101 uploads successfully before looking up the account-wide
    // preview hostname. Per-Worker tokens cannot read that unrelated endpoint.
    // Only this presentation error is eligible for independent API verification.
    assert.ok(
      (text.match(/\[ERROR\]/g) ?? []).length === 1 &&
        text.includes(
          `A request to the Cloudflare API (/accounts/${accountId}/workers/subdomain) failed.`,
        ) &&
        text.includes('Authentication error [code: 10000]'),
      'Worker upload failed; refusing to deploy',
    );
  }
  return id;
}

export function verifyUploadedVersion(version, id, message, sha) {
  assert.equal(version.id, id, 'Cloudflare returned a different version');
  assert.equal(
    version.annotations?.['workers/message'],
    message,
    'Version commit message mismatch',
  );
  assert.equal(
    version.annotations?.['workers/tag'],
    sha,
    'Version commit tag mismatch',
  );
}

export function verifyDeployment(deployment, id) {
  assert.equal(
    deployment?.versions?.length,
    1,
    'Expected one active production version',
  );
  assert.equal(
    deployment.versions[0].version_id,
    id,
    'Production version mismatch',
  );
  assert.equal(
    deployment.versions[0].percentage,
    100,
    'Production traffic is not fully deployed',
  );
}

async function deploy() {
  const {
    CLOUDFLARE_API_TOKEN: token,
    CLOUDFLARE_ACCOUNT_ID: accountId,
    GITHUB_SHA: sha,
  } = process.env;
  assert.ok(
    token && accountId && /^[a-f0-9]{40}$/.test(sha ?? ''),
    'Missing deployment credentials or Git commit',
  );
  const message = `GitHub main ${sha}`;
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/meme`;

  async function read(path) {
    const response = await fetch(base + path, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    });
    assert.ok(
      response.ok,
      `Cloudflare verification failed: HTTP ${response.status}`,
    );
    const data = await response.json();
    assert.equal(
      data.success,
      true,
      'Cloudflare verification was unsuccessful',
    );
    return data.result;
  }

  function wrangler(command, args) {
    const result = spawnSync(
      'bun',
      ['run', '--cwd', 'apps/server', command, ...args],
      {
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
        env: { ...process.env, NO_COLOR: '1', WRANGLER_SEND_METRICS: 'false' },
      },
    );
    if (result.error) throw result.error;
    assert.equal(result.signal, null, 'Wrangler was interrupted');
    return {
      status: result.status,
      output: (result.stdout ?? '') + (result.stderr ?? ''),
    };
  }

  const upload = wrangler('version:upload', [
    '--keep-vars',
    '--message',
    message,
    '--tag',
    sha,
  ]);
  let id;
  try {
    id = uploadedVersion(upload.output, upload.status, accountId);
    verifyUploadedVersion(await read(`/versions/${id}`), id, message, sha);
  } catch (error) {
    process.stderr.write(upload.output);
    throw error;
  }
  console.log(`Verified uploaded version ${id} for ${sha}`);
  if (upload.status !== 0) {
    console.log(
      'Preview hostname lookup is unavailable to the per-Worker token; version upload was verified through the Worker API.',
    );
  }

  const release = wrangler('version:deploy', [
    `${id}@100`,
    '--yes',
    '--message',
    message,
  ]);
  process.stdout.write(release.output);
  assert.equal(release.status, 0, 'Worker version deployment failed');
  verifyDeployment((await read('/deployments')).deployments[0], id);
  console.log(`Verified production version ${id} at 100% traffic`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `Worker version: \`${id}\`\n\nCommit: \`${sha}\`\n`,
    );
  }
}

if (import.meta.main) await deploy();
