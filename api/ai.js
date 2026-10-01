import { createClient } from '@supabase/supabase-js';
import { evidenceSchema, sourceReferences, instruction, validateInput, validateResult } from '../server/ai-contract.js';

export function makeHandler({ env = process.env, fetcher = fetch, clientFactory = createClient, logger = console } = {}) {
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
    let stage = 'session';
    let finishReason = 'MISSING';
    const started = Date.now();
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
      stage = 'provider';
      const references = sourceReferences(input.transcricao);
      const response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`, {
        method: 'POST', signal: AbortSignal.timeout(55000),
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: `${instruction}\nRetorne somente um objeto JSON, sem Markdown. Respeite este esquema: ${JSON.stringify(evidenceSchema(references))}\nLimite cada texto a 2000 caracteres.` }] },
          contents: [{ role: 'user', parts: [{ text: JSON.stringify({ ...input, trechosFonte: references }) }] }],
          generationConfig: { maxOutputTokens: 12000 } })
      });
      if (!response.ok) {
        // Never expose Google's raw error body: it may contain input or credentials.
        let details;
        try { details = await response.json(); } catch {}
        const reasons = details?.error?.details?.map(d => d.reason) || [];
        // Classify known provider errors without returning or logging its raw text.
        const providerMessage = typeof details?.error?.message === 'string' ? details.error.message : '';
        let message;
        if (reasons.includes('API_KEY_INVALID') || reasons.includes('API_KEY_EXPIRED') ||
            /api.?key.*(not valid|invalid|expired|not found|blocked|leaked)/i.test(providerMessage))
          message = 'A chave Gemini foi recusada. Confira GEMINI_API_KEY na Vercel e republique.';
        else if (response.status === 403)
          message = 'A chave Gemini não tem permissão para esta chamada. Confira as restrições da chave no Google AI Studio.';
        else if (response.status === 404)
          message = 'O modelo Gemini não está disponível para esta chave. Confira GEMINI_MODEL na Vercel.';
        else if (response.status === 429)
          message = 'O Gemini atingiu o limite de uso da sua conta. Aguarde e confira a cota no Google AI Studio.';
        else if (response.status === 400) {
          if (/location.*not supported|unsupported.*region/i.test(providerMessage))
            message = 'O Gemini não está disponível na região do servidor deste aplicativo. A responsável precisa revisar a região de implantação.';
          else if (/billing|free tier.*not available/i.test(providerMessage))
            message = 'O Google exige revisão do faturamento deste projeto para usar o Gemini. Confira a situação no Google AI Studio.';
          else if (/temperature|top[_ ]?p|top[_ ]?k|candidate[_ ]?count/i.test(providerMessage))
            message = 'O Gemini recusou um parâmetro de geração. Atualize o aplicativo para carregar a correção mais recente.';
          else if (/schema|response[_ ]?format|mime[_ ]?type/i.test(providerMessage))
            message = 'O Gemini recusou o formato da resposta. A integração precisa de ajuste; sua transcrição foi preservada.';
          else if (/invalid argument|invalid request|malformed|unknown name|unknown field/i.test(providerMessage))
            message = 'O Gemini recusou o conteúdo da chamada (código IA_REQUEST_INVALID). Sua transcrição foi preservada.';
          else message = 'O Gemini recusou a chamada mínima (código IA_PROVIDER_400). A responsável precisa conferir os registros da integração.';
        }
        else message = 'O Gemini está indisponível neste momento. Tente novamente mais tarde.';
        console.warn('[IA] Falha no provedor', { status: response.status });
        return res.status(response.status === 429 ? 429 : 502).json({ error: message });
      }
      stage = 'response';
      const payload = await response.json();
      const candidate = payload.candidates?.[0];
      finishReason = ['STOP', 'MAX_TOKENS', 'SAFETY', 'RECITATION', 'OTHER'].includes(candidate?.finishReason) ? candidate.finishReason : 'MISSING_OR_OTHER';
      stage = 'completion';
      if (candidate?.finishReason !== 'STOP') throw new Error('Resposta incompleta');
      const raw = candidate.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('');
      // Some models wrap JSON in a code fence even when instructed not to.
      // Accept only a single complete JSON object and keep all semantic checks.
      const json = raw?.trim().replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i, '$1');
      stage = 'json';
      const parsed = JSON.parse(json);
      stage = 'validation';
      const analysis = validateResult(parsed, input.transcricao, references);
      return res.status(200).json({ analysis, provider: 'Gemini', model: env.GEMINI_MODEL });
    } catch (error) {
      const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      const code = timeout ? 'IA_TIMEOUT' : stage === 'completion' ? 'IA_INCOMPLETE' : stage === 'json' ? 'IA_JSON_INVALID' : stage === 'validation' ? 'IA_VALIDATION_FAILED' : 'IA_CALL_FAILED';
      // Only allowlisted metadata: never log provider text, essay, tokens, or credentials.
      const validationReasons = ['Objeto inválido', 'Campo inesperado', 'Lista inválida', 'Nota inválida', 'Campo inválido', 'Trecho não encontrado na redação', 'Referência de evidência inválida', 'Justificativa ausente', 'Trecho vazio', 'Elemento sem evidência'];
      logger.warn('[IA] Análise não concluída', { code, stage, finishReason, elapsedMs: Date.now() - started,
        ...(stage === 'validation' && validationReasons.includes(error?.message) ? { reason: error.message } : {}) });
      return res.status(502).json({ error: `A IA não concluiu uma análise válida (${code}). Sua transcrição foi preservada; tente novamente.` });
    }
  };
}

export default makeHandler();
