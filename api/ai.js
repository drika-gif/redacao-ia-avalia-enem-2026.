import { createClient } from '@supabase/supabase-js';
import { schema, instruction, validateInput, validateResult } from '../server/ai-contract.js';

export function makeHandler({ env = process.env, fetcher = fetch, clientFactory = createClient } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Método não permitido.' }); }
    const token = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '')?.[1];
    if (!token) return res.status(401).json({ error: 'Entre na sua conta para usar a IA.' });
    let input;
    try { input = validateInput(typeof req.body === 'string' ? JSON.parse(req.body) : req.body); }
    catch { return res.status(400).json({ error: 'Informe tema e transcrição válida, com até 30 mil caracteres.' }); }
    if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL || !env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY)
      return res.status(503).json({ error: 'A correção por IA ainda não foi configurada pela responsável pelo aplicativo.' });
    if (!/^[a-zA-Z0-9._-]+$/.test(env.GEMINI_MODEL)) return res.status(503).json({ error: 'Modelo de IA inválido na configuração.' });
    try {
      const client = clientFactory(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data, error } = await client.auth.getUser(token);
      if (error || !data?.user || data.user.is_anonymous) return res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
      const limit = await client.rpc('consume_ai_request');
      if (limit.error) return res.status(503).json({ error: 'O serviço de IA está temporariamente indisponível.' });
      if (limit.data !== true) return res.status(429).json({ error: 'Você atingiu o limite de 20 análises por hora. Tente mais tarde.' });
      const response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`, {
        method: 'POST', signal: AbortSignal.timeout(55000),
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: instruction }] },
          contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 12000,
            responseFormat: { text: { mimeType: 'application/json', schema } } } })
      });
      if (!response.ok) return res.status(response.status === 429 ? 429 : 502).json({ error: response.status === 429 ? 'A IA atingiu seu limite de uso. Tente mais tarde.' : 'Não foi possível obter a análise da IA. Tente novamente.' });
      const payload = await response.json();
      const candidate = payload.candidates?.[0];
      if (candidate?.finishReason !== 'STOP') throw new Error('Resposta incompleta');
      const raw = candidate.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('');
      const analysis = validateResult(JSON.parse(raw), input.transcricao);
      return res.status(200).json({ analysis, provider: 'Gemini', model: env.GEMINI_MODEL });
    } catch {
      return res.status(502).json({ error: 'A IA não concluiu uma análise válida. Sua transcrição foi preservada; tente novamente.' });
    }
  };
}

export default makeHandler();
