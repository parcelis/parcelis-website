import test from 'node:test';
import assert from 'node:assert/strict';
import { handleContactForm } from '../contact-form.mjs';
import worker from '../worker.mjs';

const endpoint = 'https://preview.parcelis.dev/__ws-form/contact/?ws--managed-form-request=1';
const env = { CONTACT_WEBHOOK_URL: 'https://cloud.activepieces.com/api/v1/webhooks/test-only', PASSWORD: 'test-password' };
function submission(overrides = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    'ws--managed-form-id': 'iAlOs6SgraNpcGwk5Dtfw',
    'ws--managed-form-array-names': '[]',
    'ws--form-bot': Date.now().toString(16),
    name: 'Form route test',
    email: 'test@example.com',
    message: 'Mocked submission only',
    ...overrides,
  })) data.append(key, value);
  return data;
}
function request(data = submission(), origin = 'https://preview.parcelis.dev') {
  return new Request(endpoint, { method: 'POST', headers: { Origin: origin }, body: data });
}
test('managed submission forwards JSON and returns Webstudio success', async () => {
  let calls = 0;
  const response = await handleContactForm(request(), env, async (input, init) => {
    calls++;
    assert.equal(String(input), env.CONTACT_WEBHOOK_URL);
    assert.equal(init.method.toLowerCase(), 'post');
    assert.equal(init.redirect, 'manual');
    const body = JSON.parse(init.body);
    assert.equal(body.email, 'test@example.com');
    assert.equal(body.message, 'Mocked submission only');
    assert.equal(body['ws--managed-form-id'], undefined);
    assert.equal(new Headers(init.headers).has('authorization'), false);
    return Response.json({ accepted: true });
  });
  assert.equal(calls, 1);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
});
test('upstream failure is reported without claiming success', async () => {
  const response = await handleContactForm(request(), env, async () => new Response('unavailable', { status: 503 }));
  assert.equal(response.status, 502);
  assert.equal((await response.json()).success, false);
});
test('invalid form, stale bot field, foreign origin and oversized requests never forward', async () => {
  const send = () => { throw new Error('Unexpected external request'); };
  for (const data of [
    submission({ 'ws--managed-form-id': 'unknown' }),
    submission({ 'ws--form-bot': '0' }),
  ]) assert.equal((await handleContactForm(request(data), env, send)).status, 400);
  assert.equal((await handleContactForm(request(submission(), 'https://other.example'), env, send)).status, 403);
  const oversized = new Request(endpoint, { method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=test' }, body: 'x'.repeat(70000) });
  assert.equal((await handleContactForm(oversized, env, send)).status, 400);
});
test('method and missing configuration fail without an external request', async () => {
  assert.equal((await handleContactForm(new Request(endpoint), env)).status, 405);
  assert.equal((await handleContactForm(request(), {})).status, 503);
});
test('password guard still protects form requests and assets', async () => {
  const noAuth = await worker.fetch(request(), env);
  assert.equal(noAuth.status, 401);
  const authorized = new Request('https://preview.parcelis.dev/', { headers: { Authorization: 'Basic ' + btoa('admin:test-password') } });
  const response = await worker.fetch(authorized, {
    ...env,
    ASSETS: { fetch: async (r) => {
      assert.equal(r.headers.has('Authorization'), false);
      return new Response('existing site');
    } },
  });
  assert.equal(await response.text(), 'existing site');
});
test('authenticated invalid form reaches the handler instead of static assets', async () => {
  const r = request(submission({ 'ws--managed-form-id': 'unknown' }));
  r.headers.set('Authorization', 'Basic ' + btoa('admin:test-password'));
  const response = await worker.fetch(r, { ...env, ASSETS: { fetch() { throw new Error('Unexpected asset lookup'); } } });
  assert.equal(response.status, 400);
});
