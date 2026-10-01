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
      assert.deepEqual(body.generationConfig, { maxOutputTokens: 12000 });
      assert.equal(body.systemInstruction.parts[0].text.includes(JSON.stringify(geminiSchema)), true);
      for (const key of ['temperature', 'topP', 'topK', 'candidateCount'])
        assert.equal(key in body.generationConfig, false, `${key} must not be sent to Gemini 3.8`);
      assert.equal(body.contents[0].parts[0].text.includes('nome_estudante'), false);
      return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(result()) }] } }] }) };
    }, ...overrides });
  const res = { code: 0, value: null, headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(n) { this.code=n; return this; }, json(v) { this.value=v; return this; } };
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid-token' }, body: { tema: 'Tema', transcricao: 'texto teste' }, ...reqOverride }, res);
  return { res, called };
};
test('safe diagnostics distinguish timeout, incomplete JSON, and invalid evidence', async () => {
  const cases = [
    [async () => { throw Object.assign(new Error(env.GEMINI_API_KEY), { name: 'TimeoutError' }); }, 'IA_TIMEOUT'],
    [async () => ({ ok: true, json: async () => ({ candidates: [{ finishReason: 'MAX_TOKENS' }] }) }), 'IA_INCOMPLETE'],
    [async () => ({ ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: env.GEMINI_API_KEY }] } }] }) }), 'IA_JSON_INVALID'],
    [async () => { const bad = result(); bad.c1.trechos[0].trecho = 'inventado'; return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(bad) }] } }] }) }; }, 'IA_VALIDATION_FAILED']
  ];
  for (const [fetcher, code] of cases) {
    const logs = [];
    const { res } = await invoke({ fetcher, logger: { warn: (...args) => logs.push(args) } });
    assert.equal(res.code, 502);
    assert.equal(res.value.analysis, undefined);
    assert.match(res.value.error, new RegExp(code));
    assert.equal(logs[0][1].code, code);
    assert.equal(JSON.stringify(logs).includes(env.GEMINI_API_KEY), false);
    assert.equal(JSON.stringify(logs).includes('texto teste'), false);
  }
});
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
test('evidence tolerates only whitespace and returns the literal source', () => {
  const source = 'texto\n\t teste';
  assert.equal(validateResult(result(), source).c1.trechos[0].trecho, source);
  for (const changed of ['texto alterado', 'Texto teste', 'texto, teste', 'texto … teste']) {
    const bad = result(); bad.c1.trechos[0].trecho = changed;
    assert.throws(() => validateResult(bad, source), /Trecho não encontrado/);
  }
  const regexText = result(); regexText.c1.trechos[0].trecho = '(texto) + teste?';
  assert.equal(validateResult(regexText, '(texto)\n+\tteste?').c1.trechos[0].trecho, '(texto)\n+\tteste?');
  assert.throws(() => validateResult(regexText, 'texto teste'), /Trecho não encontrado/);
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
test('unsupported generation parameters have safe actionable diagnostics', async () => {
  const { res } = await invoke({ fetcher: async () => ({ ok: false, status: 400,
    json: async () => ({ error: { message: `temperature unsupported ${env.GEMINI_API_KEY}` } }) }) });
  assert.match(res.value.error, /parâmetro de geração/);
  assert.equal(JSON.stringify(res.value).includes(env.GEMINI_API_KEY), false);
});
test('region and billing failures are not confused with malformed request', async () => {
  for (const [message, expected] of [['User location is not supported', /região do servidor/], ['Free tier is not available; enable billing', /faturamento/]]) {
    const { res } = await invoke({ fetcher: async () => ({ ok: false, status: 400, json: async () => ({ error: { message } }) }) });
    assert.match(res.value.error, expected);
  }
});
test('minimal call accepts fenced JSON but still rejects invented evidence', async () => {
  for (const invented of [false, true]) {
    const value = result();
    if (invented) value.c1.trechos[0].trecho = 'frase que não existe';
    const { res } = await invoke({ fetcher: async () => ({ ok: true, json: async () => ({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '```json\n' + JSON.stringify(value) + '\n```' }] } }]
    }) }) });
    assert.equal(res.code, invented ? 502 : 200);
    if (invented) assert.equal(res.value.analysis, undefined);
  }
});
test('invalid key without structured details is identified and never retried', async () => {
  let calls = 0;
  const { res } = await invoke({ fetcher: async () => {
    calls++;
    return { ok: false, status: 400, json: async () => ({ error: { message: 'API key not valid. Please pass a valid API key.' } }) };
  } });
  assert.equal(calls, 1);
  assert.match(res.value.error, /chave Gemini foi recusada/);
});
