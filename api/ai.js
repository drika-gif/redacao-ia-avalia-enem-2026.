import { createClient } from '@supabase/supabase-js';
import { geminiSchema, instruction, validateInput, validateResult } from '../server/ai-contract.js';

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
            responseFormat: { text: { mimeType: 'APPLICATION_JSON', schema: geminiSchema } } } })
      });
      if (!response.ok) {
        // Never expose Google's raw error body: it may contain input or credentials.
        let details;
        try { details = await response.json(); } catch {}
        const reasons = details?.error?.details?.map(d => d.reason) || [];
        let message;
        if (reasons.includes('API_KEY_INVALID') || reasons.includes('API_KEY_EXPIRED'))
          message = 'A chave Gemini foi recusada. Confira GEMINI_API_KEY na Vercel e republique.';
        else if (response.status === 403)
          message = 'A chave Gemini não tem permissão para esta chamada. Confira as restrições da chave no Google AI Studio.';
        else if (response.status === 404)
          message = 'O modelo Gemini não está disponível para esta chave. Confira GEMINI_MODEL na Vercel.';
        else if (response.status === 429)
          message = 'O Gemini atingiu o limite de uso da sua conta. Aguarde e confira a cota no Google AI Studio.';
        else if (response.status === 400)
          message = 'O Gemini recusou a configuração da análise (erro 400). Verifique se a atualização mais recente foi publicada.';
        else message = 'O Gemini está indisponível neste momento. Tente novamente mais tarde.';
        console.warn('[IA] Falha no provedor', { status: response.status });
        return res.status(response.status === 429 ? 429 : 502).json({ error: message });
      }
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
