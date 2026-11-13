import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../packages/api-client/src/client.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const { WeSpaceApiClient } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

test('concurrent unauthorized requests settle when shared refresh fails', async () => {
  const originalFetch = globalThis.fetch;
  let refreshes = 0;
  globalThis.fetch = async (url) => {
    if (url.endsWith('/auth/refresh')) {
      refreshes++;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    return new Response('{}', { status: 401 });
  };
  try {
    const client = new WeSpaceApiClient();
    globalThis.window = {};
    globalThis.localStorage = { setItem() {}, removeItem() {} };
    client.setToken('expired', 'refresh');
    const results = await Promise.allSettled([client.getFeed(), client.getFeed()]);
    assert.equal(refreshes, 1);
    assert.ok(results.every(result => result.status === 'rejected'));
  } finally {
    globalThis.fetch = originalFetch;
    delete globalThis.window;
    delete globalThis.localStorage;
  }
});
