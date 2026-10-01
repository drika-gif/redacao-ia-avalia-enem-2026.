import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHandler } from '../api/ai.js';
import { schema, geminiSchema, validateResult } from '../server/ai-contract.js';

const empty = spec => spec.type === 'object' ? Object.fromEntries(Object.entries(spec.properties).map(([k,v]) => [k, empty(v)])) : spec.type === 'array' ? [] : spec.type === 'boolean' ? false : spec.type === 'integer' ? 120 : '';
const result = () => {
  const value = empty(schema);
  for (const k of ['c1','c2','c3','c4','c5']) value[k].justificativa = 'Avaliação fundamentada.';
  value.c1.trechos = [{ trecho: 'texto teste', explicacao: 'Trecho real.' }];
  return value;
};
const env = { GEMINI_API_KEY: 'server-only-secret', GEMINI_MODEL: 'test-model', VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_ANON_KEY: 'public-key' };
const invoke = async (overrides = {}, reqOverride = {}) => {
  let called = false;
  const handler = makeHandler({ env,
    clientFactory: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'real-user' } }, error: null }) }, rpc: async () => ({ data: true }) }),
    fetcher: async (_url, opts) => {
      called = true;
      assert.equal(opts.headers['x-goog-api-key'], env.GEMINI_API_KEY);
      const body = JSON.parse(opts.body);
      assert.equal(body.generationConfig.responseFormat.text.mimeType, 'APPLICATION_JSON');
      assert.deepEqual(body.generationConfig.responseFormat.text.schema, geminiSchema);
      assert.equal('responseJsonSchema' in body.generationConfig, false);
      assert.equal(body.contents[0].parts[0].text.includes('nome_estudante'), false);
      return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(result()) }] } }] }) };
    }, ...overrides });
  const res = { code: 0, value: null, headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(n) { this.code=n; return this; }, json(v) { this.value=v; return this; } };
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid-token' }, body: { tema: 'Tema', transcricao: 'texto teste' }, ...reqOverride }, res);
  return { res, called };
};
test('authenticated successful analysis contains no API secret', async () => {
  const { res, called } = await invoke(); assert.equal(res.code, 200); assert.equal(called, true);
  assert.equal(JSON.stringify(res.value).includes(env.GEMINI_API_KEY), false);
});
test('unauthenticated request never calls provider', async () => {
  const { res, called } = await invoke({}, { headers: {} }); assert.equal(res.code, 401); assert.equal(called, false);
});
test('invalid token never calls provider', async () => {
  const { res, called } = await invoke({ clientFactory: () => ({ auth: { getUser: async () => ({ error: 'invalid' }) } }) });
  assert.equal(res.code, 401); assert.equal(called, false);
});
test('rate limit blocks provider call', async () => {
  const { res, called } = await invoke({ clientFactory: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'real' } } }) }, rpc: async () => ({ data: false }) }) });
  assert.equal(res.code, 429); assert.equal(called, false);
});
test('missing configuration fails explicitly', async () => {
  const { res, called } = await invoke({ env: { ...env, GEMINI_API_KEY: '' } }); assert.equal(res.code, 503); assert.equal(called, false);
});
test('oversized transcription rejected before authentication/provider', async () => {
  const { res, called } = await invoke({}, { body: { tema: 'Tema', transcricao: 'a'.repeat(30001) } }); assert.equal(res.code, 400); assert.equal(called, false);
});
test('invalid grades and hallucinated excerpts rejected', () => {
  const badScore = result(); badScore.c1.sugerida=150; assert.throws(() => validateResult(badScore,'texto teste'));
  const invented = result(); invented.c1.trechos[0].trecho='inventado'; assert.throws(() => validateResult(invented,'texto teste'));
});
test('provider schema omits unsupported lengths but local validation keeps them', () => {
  assert.equal(JSON.stringify(geminiSchema).includes('maxLength'), false);
  assert.deepEqual(geminiSchema.properties.c1.properties.sugerida.enum, [0,40,80,120,160,200]);
  const tooLong = result(); tooLong.c1.justificativa = 'a'.repeat(2001);
  assert.throws(() => validateResult(tooLong, 'texto teste'));
});
test('provider failure does not return automatic fallback grades', async () => {
  const { res } = await invoke({ fetcher: async () => ({ ok: false, status: 500 }) }); assert.equal(res.code, 502); assert.equal(res.value.analysis, undefined);
});
test('placeholder-only text never calls the provider', async () => {
  const { res, called } = await invoke({}, { body: { tema: 'Tema', transcricao: '[trecho ilegível]' } });
  assert.equal(res.code, 400); assert.equal(called, false);
});
test('provider diagnostics never expose raw body or secrets', async () => {
  for (const status of [400, 403, 404, 429]) {
    const { res } = await invoke({ fetcher: async () => ({ ok: false, status, json: async () => ({ error: { message: env.GEMINI_API_KEY } }) }) });
    assert.equal(JSON.stringify(res.value).includes(env.GEMINI_API_KEY), false);
    assert.equal(res.code, status === 429 ? 429 : 502);
  }
});
test('invalid API key displays specific guidance', async () => {
  const { res } = await invoke({ fetcher: async () => ({ ok: false, status: 400, json: async () => ({ error: { details: [{ reason: 'API_KEY_INVALID' }] } }) }) });
  assert.match(res.value.error, /chave Gemini foi recusada/);
});
