import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHandler } from '../api/ai.js';
import { schema, geminiSchema, evidenceSchema, sourceReferences, validateResult } from '../server/ai-contract.js';

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
      const input = JSON.parse(body.contents[0].parts[0].text);
      assert.deepEqual(input.trechosFonte, { E001: 'texto teste' });
      assert.deepEqual(body.generationConfig, { maxOutputTokens: 12000, responseMimeType: 'application/json' });
      assert.equal(body.systemInstruction.parts[0].text.includes(JSON.stringify(evidenceSchema(input.trechosFonte))), true);
      for (const key of ['temperature', 'topP', 'topK', 'candidateCount', 'responseFormat', 'responseSchema', 'responseJsonSchema'])
        assert.equal(key in body.generationConfig, false, `${key} must not be sent to Gemini`);
      assert.equal(body.contents[0].parts[0].text.includes('nome_estudante'), false);
      const value = result(); value.c1.trechos[0].trecho = 'E001';
      return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } }] }) };
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
  assert.equal(res.value.analysis.c1.trechos[0].trecho, 'texto teste');
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
test('format and unknown name errors have safe actionable diagnostics', async () => {
  for (const [msg, pattern] of [
    ['Invalid JSON payload received. Unknown name "responseFormat" at generation_config', /formato da resposta|conteúdo da chamada/],
    ['responseMimeType is not supported', /formato da resposta/],
    ['malformed request payload', /conteúdo da chamada/]
  ]) {
    const { res } = await invoke({ fetcher: async () => ({ ok: false, status: 400,
      json: async () => ({ error: { message: `${msg} ${env.GEMINI_API_KEY}` } }) }) });
    assert.match(res.value.error, pattern);
    assert.equal(JSON.stringify(res.value).includes(env.GEMINI_API_KEY), false);
  }
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
    value.c1.trechos[0].trecho = invented ? 'frase que não existe' : 'E001';
    const { res } = await invoke({ fetcher: async () => ({ ok: true, json: async () => ({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '```json\n' + JSON.stringify(value) + '\n```' }] } }]
    }) }) });
    assert.equal(res.code, invented ? 502 : 200);
    if (invented) assert.equal(res.value.analysis, undefined);
  }
});
test('source IDs expand into exact evidence in every evidence field', () => {
  const source = 'texto\n teste. A escola deve agir!';
  const refs = sourceReferences(source);
  assert.deepEqual(refs, { E001: 'texto\n teste.', E002: 'A escola deve agir!' });
  const value = result();
  for (const key of ['c1','c2','c3','c4']) value[key].trechos = [{ trecho: 'E001', explicacao: 'Observação.' }];
  for (const el of Object.values(value.c5.quadro)) { el.encontrado = true; el.trecho = 'E002'; }
  value.notaZero.evidencia = 'E001';
  value.devolutiva.trechosParaRevisar = [{ original: 'E001', problema: 'Problema.', orientacao: 'Orientação.' }];
  const analysis = validateResult(value, source, refs);
  for (const key of ['c1','c2','c3','c4']) assert.equal(analysis[key].trechos[0].trecho, refs.E001);
  for (const el of Object.values(analysis.c5.quadro)) assert.equal(el.trecho, refs.E002);
  assert.equal(analysis.notaZero.evidencia, refs.E001);
  assert.equal(analysis.devolutiva.trechosParaRevisar[0].original, refs.E001);
});
test('unknown, copied, combined, and inherited source IDs fail closed', () => {
  for (const id of ['E999', 'texto teste', 'E001 E002', 'toString', '__proto__']) {
    const value = result(); value.c1.trechos[0].trecho = id;
    assert.throws(() => validateResult(value, 'texto teste', sourceReferences('texto teste')), /Referência de evidência inválida/);
  }
  const value = result(); value.c1.trechos[0].trecho = 'E001';
  assert.throws(() => validateResult(value, 'texto teste', { E001: 'inventado' }), /Referência de evidência inválida/);
});
test('long source fragments remain literal and fit the local schema', () => {
  for (const source of ['a'.repeat(30000), ('palavra\n outra ').repeat(1800), 'a.'.repeat(15000)]) {
    const refs = sourceReferences(source);
    assert.ok(Object.keys(refs).length > 1);
    assert.ok(Object.keys(refs).length <= 220);
    for (const fragment of Object.values(refs)) { assert.ok(fragment.length <= 1800); assert.ok(source.includes(fragment)); }
    const spec = evidenceSchema(refs);
    assert.deepEqual(spec.properties.c1.properties.trechos.items.properties.trecho.enum, ['', ...Object.keys(refs)]);
    assert.equal(JSON.stringify(spec).includes('maxLength'), false);
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

test('direct photo analysis sends inlineData to Gemini and returns transcription', async () => {
  let capturedBody = null;
  let calledPhoto = false;
  const samplePhotoResult = result();
  samplePhotoResult.transcricao = 'Texto manuscrito lido diretamente da foto.';
  samplePhotoResult.c1.trechos = [{ trecho: 'Texto manuscrito', explicacao: 'Exemplo.' }];

  const { res } = await invoke({
    fetcher: async (_url, opts) => {
      calledPhoto = true;
      capturedBody = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({
          candidates: [{
            finishReason: 'STOP',
            content: { parts: [{ text: JSON.stringify(samplePhotoResult) }] }
          }]
        })
      };
    }
  }, {
    body: {
      tema: 'Desafios da Educação',
      imagens: [{ dataUrl: 'data:image/jpeg;base64,VEVTVEVfRk9UTw==' }]
    }
  });

  assert.equal(calledPhoto, true);
  assert.equal(res.code, 200);
  assert.equal(res.value.analysis.transcricao, 'Texto manuscrito lido diretamente da foto.');
  assert.equal(capturedBody.contents[0].parts[0].inlineData.mimeType, 'image/jpeg');
  assert.equal(capturedBody.contents[0].parts[0].inlineData.data, 'VEVTVEVfRk9UTw==');
  assert.equal(capturedBody.contents[0].parts[1].text.includes('Desafios da Educação'), true);
  assert.equal(capturedBody.generationConfig.responseMimeType, 'application/json');
});

test('blurry photo flags precisaNovaFoto without 502 error and asks for another image', async () => {
  const blurryResult = {
    precisaNovaFoto: true,
    motivoNovaFoto: 'A imagem está excessivamente borrada e cortada nas margens.',
    limitacoesLeitura: 'Foto ilegível',
    transcricao: ''
  };

  const { res } = await invoke({
    fetcher: async () => ({
      ok: true,
      json: async () => ({
        candidates: [{
          finishReason: 'STOP',
          content: { parts: [{ text: JSON.stringify(blurryResult) }] }
        }]
      })
    })
  }, {
    body: {
      tema: 'Tema Teste',
      imagens: [{ dataUrl: 'data:image/jpeg;base64,Ymx1cnJ5' }]
    }
  });

  assert.equal(res.code, 200);
  assert.equal(res.value.analysis.precisaNovaFoto, true);
  assert.match(res.value.analysis.motivoNovaFoto, /excessivamente borrada/);
  assert.equal(res.value.analysis.c1.sugerida, 0);
});

test('unsupported image format and excessive images rejected before calling Gemini', async () => {
  const { res: resFormat, called: calledFormat } = await invoke({}, {
    body: {
      tema: 'Tema',
      imagens: [{ dataUrl: 'data:image/bmp;base64,Ym1w' }]
    }
  });
  assert.equal(resFormat.code, 400);
  assert.equal(calledFormat, false);

  const { res: resCount, called: calledCount } = await invoke({}, {
    body: {
      tema: 'Tema',
      imagens: Array(5).fill({ dataUrl: 'data:image/jpeg;base64,Zm90bw==' })
    }
  });
  assert.equal(resCount.code, 400);
  assert.equal(calledCount, false);
});
