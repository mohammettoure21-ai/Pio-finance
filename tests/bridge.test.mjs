import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { grantAgent, revokeAgent } from '../server/operator.mjs';
import { join } from 'node:path';
import { once } from 'node:events';
import { initialPortfolio } from '../src/finance/model.ts';
import { tmpdir } from 'node:os';

const module = await import('../server/store.mjs').catch(() => ({}));
test('private persistent store bootstraps only outside HTTP and never stores plaintext password', async () => {
  assert.equal(typeof module.openStore, 'function', 'persistent store is missing');
  const dir = mkdtempSync(join(tmpdir(), 'pio-test-'));
  try {
    let store = module.openStore(dir);
    store.init('synthetic-test-password-01');
    assert.equal(store.verifyPassword('wrong'), false);
    assert.equal(store.verifyPassword('synthetic-test-password-01'), true);
    assert.throws(() => store.init('another-password'), /initialized/);
    assert.equal(JSON.stringify(store.read()).includes('synthetic-test-password'), false);
    store.close();
    store = module.openStore(dir);
    assert.equal(store.verifyPassword('synthetic-test-password-01'), true);
    assert.equal(store.read().revision, 0);
    store.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

const httpModule = await import('../server/http.mjs').catch(() => ({}));
async function fixture(run) {
  const dir = mkdtempSync(join(tmpdir(), 'pio-http-'));
  const store = module.openStore(dir);
  store.init('synthetic-test-password-01');
  const server = httpModule.createBridge({ store, origin: 'http://127.0.0.1:5173' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api/pio`;
  let cookie = '', csrf = '';
  async function req(path, method = 'GET', body, extra = {}) {
    const headers = { origin: 'http://127.0.0.1:5173', ...cookie && {cookie}, ...csrf && {'x-pio-csrf': csrf}, ...extra };
    if (body !== undefined) headers['content-type'] = 'application/json';
    const r = await fetch(base+path, {method, headers, body: body === undefined ? undefined : JSON.stringify(body)});
    const data = await r.json();
    if (r.headers.get('set-cookie')) cookie = r.headers.get('set-cookie').split(';')[0];
    if (data.csrf) csrf = data.csrf;
    return {status: r.status, data, headers: r.headers};
  }
  try { await run({store, req, base}); }
  finally { server.closeAllConnections(); await new Promise(r => server.close(r)); store.close(); rmSync(dir, {recursive:true, force:true}); }
}
test('HTTP owner session has hardened cookie, Origin/CSRF checks, expiry and logout', async () => {
  assert.equal(typeof httpModule.createBridge, 'function', 'HTTP authentication is missing');
  await fixture(async ({req,store}) => {
    assert.equal((await req('/portfolio')).status, 401);
    assert.equal((await req('/session/login','POST',{password:'wrong'})).status, 401);
    assert.equal((await req('/session/login','POST',{password:'synthetic-test-password-01'}, {origin:'https://evil.invalid'})).status, 403);
    const login = await req('/session/login','POST',{password:'synthetic-test-password-01'});
    assert.equal(login.status,200);
    assert.match(login.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    assert.equal((await req('/session/me')).data.role,'owner');
    assert.equal((await req('/session/logout','POST',{}, {'x-pio-csrf':''})).status,403);
    assert.equal((await req('/session/logout','POST',{}, {origin:'https://evil.invalid'})).status,403);
    assert.equal((await req('/session/logout','POST',{})).status,200);
    assert.equal((await req('/portfolio')).status,401);
    await req('/session/login','POST',{password:'synthetic-test-password-01'});
    store.transaction(s => Object.values(s.sessions).forEach(v => v.expires=0));
    assert.equal((await req('/session/me')).status,401);
  });
});

test('explicit initialization, snapshot CAS/idempotency and durable version history preserve the exact schema', async () => {
  await fixture(async ({req,store}) => {
    await req('/session/login','POST',{password:'synthetic-test-password-01'});
    const portfolio=initialPortfolio(); portfolio.companies[0].notes='synthetic note';
    const payload={portfolio,consent:true,expectedRevision:0,idempotencyKey:'initialize-test-1'};
    assert.equal((await req('/portfolio/initialize','POST',{...payload,consent:false})).status,400);
    assert.equal((await req('/portfolio/initialize','POST',payload)).status,200);
    assert.deepEqual((await req('/portfolio')).data,{revision:1,portfolio});
    assert.equal((await req('/portfolio/initialize','POST',payload)).data.revision,1);
    assert.equal((await req('/portfolio/initialize','POST',{...payload,idempotencyKey:'initialize-test-2'})).status,409);
    assert.equal((await req('/portfolio','PUT',{...payload,expectedRevision:0,idempotencyKey:'save-conflict-01'})).status,409);
    const next=structuredClone(portfolio); next.companies[0].notes='updated synthetic';
    const save={portfolio:next,expectedRevision:1,idempotencyKey:'save-snapshot-01'};
    const [a,b]=await Promise.all([req('/portfolio','PUT',save),req('/portfolio','PUT',save)]);
    assert.equal(a.status,200); assert.deepEqual(a.data,b.data); assert.equal(a.data.revision,2);
    assert.equal((await req('/portfolio','PUT',{...save,portfolio})).status,409);
    assert.equal((await req('/portfolio','PUT',{...save,expectedRevision:2,idempotencyKey:'bad-save-0001',portfolio:{version:1}})).status,400);
    assert.deepEqual((await req('/portfolio')).data,{revision:2,portfolio:next});
    assert.equal(store.read().versions.length,2);
    assert.deepEqual(store.read().versions[0].portfolio,portfolio);
  });
});
