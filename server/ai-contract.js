const text = { type: 'string', maxLength: 2000 };
const list = { type: 'array', maxItems: 12, items: text };
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const score = { type: 'integer', enum: [0, 40, 80, 120, 160, 200] };
const analysis = object({
  sugerida: score,
  justificativa: text,
  erros: list,
  trechos: { type: 'array', maxItems: 8, items: object({ trecho: text, explicacao: text }) },
  orientacao: text
});
const element = object({ encontrado: { type: 'boolean' }, trecho: text, feedback: text });

export const schema = object({
  transcricao: { type: 'string', maxLength: 30000 },
  precisaNovaFoto: { type: 'boolean' },
  motivoNovaFoto: text,
  limitacoesLeitura: text,
  c1: analysis,
  c2: analysis,
  c3: analysis,
  c4: analysis,
  c5: object({ sugerida: score, justificativa: text, quadro: object({ agente: element, acao: element, modo: element, efeito: element, detalhamento: element }) }),
  notaZero: object({ isZeroRisk: { type: 'boolean' }, motivo: text, evidencia: text, explicacao: text }),
  devolutiva: object({
    pontosFortes: list,
    precisaMelhorar: list,
    errosCategorizados: object({ ortografia: list, pontuacao: list, concordancia: list, estrutura: list, argumentacao: list, coesao: list, propostaDeIntervencao: list }),
    trechosParaRevisar: { type: 'array', maxItems: 8, items: object({ original: text, problema: text, orientacao: text }) },
    abordagemTema: object({
      fraseTema: text,
      classificacao: text,
      elementosDesenvolvidos: list,
      recortesAusentes: list,
      justificativa: text,
      orientacao: text
    })
  })
});

// Remove palavras-chave restritas do OpenAPI da Google (maxLength, additionalProperties)
function providerSchema(spec) {
  const { maxLength, additionalProperties, ...supported } = spec;
  if (supported.properties) supported.properties = Object.fromEntries(
    Object.entries(supported.properties).map(([key, value]) => [key, providerSchema(value)]));
  if (supported.items) supported.items = providerSchema(supported.items);
  return supported;
}
export const geminiSchema = providerSchema(schema);

export function sourceReferences(transcricao) {
  const references = {};
  if (!transcricao) return references;
  let sentences = transcricao.match(/[^.!?]+[.!?]+|[^.!?]+$/gu) || [transcricao];
  if (sentences.length > 200) sentences = transcricao.match(/[\s\S]{1,1800}/gu);
  for (let sentence of sentences) {
    sentence = sentence.trim();
    while (sentence) {
      let end = Math.min(sentence.length, 1800);
      if (end < sentence.length) {
        const space = sentence.lastIndexOf(' ', end);
        if (space > 0) end = space;
      }
      const fragment = sentence.slice(0, end).trim();
      if (fragment) references[`E${String(Object.keys(references).length + 1).padStart(3, '0')}`] = fragment;
      sentence = sentence.slice(end).trim();
    }
  }
  return references;
}

export function evidenceSchema(references) {
  const spec = structuredClone(geminiSchema);
  const ref = { type: 'string', enum: ['', ...Object.keys(references)] };
  for (const key of ['c1', 'c2', 'c3', 'c4']) spec.properties[key].properties.trechos.items.properties.trecho = ref;
  for (const el of Object.values(spec.properties.c5.properties.quadro.properties)) el.properties.trecho = ref;
  spec.properties.notaZero.properties.evidencia = ref;
  spec.properties.devolutiva.properties.trechosParaRevisar.items.properties.original = ref;
  return spec;
}

export function validateInput(body) {
  if (!body || typeof body.tema !== 'string' || !body.tema.trim() || body.tema.length > 1000) {
    throw new Error('Informe o tema da redação (até 1000 caracteres).');
  }

  const hasImages = Array.isArray(body.imagens) && body.imagens.length > 0;
  const hasText = typeof body.transcricao === 'string' &&
    Boolean(body.transcricao.replace(/\[trecho ilegível\]/gi, '').trim());

  if (!hasImages && !hasText) {
    throw new Error('Informe o tema e uma transcrição de até 30 mil caracteres.');
  }

  const imagens = [];
  if (hasImages) {
    if (body.imagens.length > 4) {
      throw new Error('Envie no máximo 4 fotos por redação.');
    }
    for (const item of body.imagens) {
      if (!item || typeof item !== 'object') throw new Error('Dados de imagem inválidos.');
      const raw = item.dataUrl || item.data;
      if (typeof raw !== 'string' || !raw.trim()) throw new Error('Dados de imagem vazios.');

      let mimeType = item.mimeType || 'image/jpeg';
      let data = raw;
      const match = raw.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        data = match[2];
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'].includes(mimeType)) {
        throw new Error('Formato de imagem não suportado. Use JPG, PNG, WEBP ou PDF.');
      }
      if (data.length > 10_000_000) {
        throw new Error('A imagem é muito grande. Reduza a resolução antes de enviar.');
      }
      imagens.push({ mimeType, data });
    }
  }

  const transcricao = typeof body.transcricao === 'string' ? body.transcricao.trim() : '';
  if (transcricao.length > 30000) {
    throw new Error('A transcrição deve ter até 30 mil caracteres.');
  }

  return { tema: body.tema.trim(), transcricao, imagens };
}

const VALID_SCORES = [0, 40, 80, 120, 160, 200];

export function normalizeScore(val) {
  if (typeof val === 'string') val = parseInt(val, 10);
  if (typeof val !== 'number' || !Number.isFinite(val)) return 120;
  if (VALID_SCORES.includes(val)) return val;
  let closest = VALID_SCORES[0];
  let minDiff = Math.abs(val - closest);
  for (const s of VALID_SCORES) {
    const diff = Math.abs(val - s);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  }
  return closest;
}

export function matchImageEvidence(s, text) {
  if (!s || typeof s !== 'string') return '';
  let cleaned = s.trim()
    .replace(/^["'“”«»‘’`\s]+|["'“”«»‘’`\s]+$/gu, '')
    .replace(/^(\.\.\.|…|\[\.\.\.\]|\(\.\.\.\))\s*/gu, '')
    .replace(/\s*(\.\.\.|…|\[\.\.\.\]|\(\.\.\.\))$/gu, '')
    .trim();

  if (!cleaned) return '';
  if (cleaned.toLowerCase() === '[trecho ilegível]' || cleaned.toLowerCase() === 'trecho ilegível') {
    return '[trecho ilegível]';
  }

  // 1. Correspondência literal
  if (text.includes(cleaned)) return cleaned;

  // 2. Correspondência sem diferenciar maiúsculas/minúsculas
  const lowerText = text.toLowerCase();
  const lowerCleaned = cleaned.toLowerCase();
  const idx = lowerText.indexOf(lowerCleaned);
  if (idx !== -1) return text.slice(idx, idx + cleaned.length);

  // 3. Correspondência tolerante a pontuações e espaçamentos entre palavras
  const words = cleaned.match(/[\p{L}\p{N}]+/gu) || [];
  if (words.length > 0) {
    const escapeRegex = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = words.map(w => escapeRegex(w)).join('(?:[\\s\\p{P}\\p{S}]+)');
    const match = text.match(new RegExp(pattern, 'ui'));
    if (match) return match[0];
  }

  // 4. Subsequência para trechos mais longos (>= 3 palavras)
  if (words.length >= 3) {
    const escapeRegex = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const firstAnchor = words.slice(0, 3).map(w => escapeRegex(w)).join('(?:[\\s\\p{P}\\p{S}]+)');
    const firstMatch = text.match(new RegExp(firstAnchor, 'ui'));
    if (firstMatch) {
      const startIdx = firstMatch.index;
      const candidateSpan = text.slice(startIdx, startIdx + Math.round(cleaned.length * 1.4));
      const spanWords = candidateSpan.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
      const matchCount = words.filter(w => spanWords.includes(w.toLowerCase())).length;
      if (matchCount / words.length >= 0.6) {
        const lastWord = words[words.length - 1].toLowerCase();
        const lastIdx = candidateSpan.toLowerCase().lastIndexOf(lastWord);
        if (lastIdx !== -1) {
          return candidateSpan.slice(0, lastIdx + lastWord.length).trim();
        }
        return firstMatch[0];
      }
    }
  }

  return null;
}

function makeNovaFotoResult(result) {
  if (typeof result.motivoNovaFoto !== 'string' || !result.motivoNovaFoto.trim()) {
    result.motivoNovaFoto = 'A foto enviada não permitiu uma avaliação confiável. Por favor, tire outra foto mais nítida e iluminada.';
  }
  result.precisaNovaFoto = true;
  result.transcricao = typeof result.transcricao === 'string' ? result.transcricao : '';
  result.limitacoesLeitura = typeof result.limitacoesLeitura === 'string' && result.limitacoesLeitura.trim()
    ? result.limitacoesLeitura
    : result.motivoNovaFoto;
  result.notaZero = { isZeroRisk: false, motivo: '', evidencia: '', explicacao: '' };
  for (const key of ['c1', 'c2', 'c3', 'c4']) {
    result[key] = { sugerida: 0, justificativa: result.motivoNovaFoto, erros: [], trechos: [], orientacao: 'Capture uma nova foto da redação.' };
  }
  result.c5 = {
    sugerida: 0,
    justificativa: result.motivoNovaFoto,
    quadro: {
      agente: { encontrado: false, trecho: '', feedback: '' },
      acao: { encontrado: false, trecho: '', feedback: '' },
      modo: { encontrado: false, trecho: '', feedback: '' },
      efeito: { encontrado: false, trecho: '', feedback: '' },
      detalhamento: { encontrado: false, trecho: '', feedback: '' }
    }
  };
  result.devolutiva = {
    pontosFortes: [],
    precisaMelhorar: ['Enviar nova foto da redação com boa nitidez e iluminação.'],
    errosCategorizados: { ortografia: [], pontuacao: [], concordancia: [], estrutura: [], argumentacao: [], coesao: [], propostaDeIntervencao: [] },
    trechosParaRevisar: [],
    abordagemTema: {
      fraseTema: '',
      classificacao: 'Pendente',
      elementosDesenvolvidos: [],
      recortesAusentes: [],
      justificativa: 'Avaliação temática pendente até o envio de nova foto legível.',
      orientacao: 'Tire uma foto nítida e bem iluminada para possibilitar a avaliação temática completa.'
    }
  };
  return result;
}

function sanitizeImageResult(result) {
  result.precisaNovaFoto = Boolean(result.precisaNovaFoto);
  result.motivoNovaFoto = typeof result.motivoNovaFoto === 'string' ? result.motivoNovaFoto.slice(0, 2000) : '';
  result.limitacoesLeitura = typeof result.limitacoesLeitura === 'string' ? result.limitacoesLeitura.slice(0, 2000) : '';
  result.transcricao = typeof result.transcricao === 'string' ? result.transcricao.slice(0, 30000) : '';

  result.notaZero = result.notaZero || {};
  result.notaZero.isZeroRisk = Boolean(result.notaZero.isZeroRisk);
  result.notaZero.motivo = typeof result.notaZero.motivo === 'string' ? result.notaZero.motivo.slice(0, 2000) : '';
  result.notaZero.evidencia = typeof result.notaZero.evidencia === 'string' ? result.notaZero.evidencia.slice(0, 2000) : '';
  result.notaZero.explicacao = typeof result.notaZero.explicacao === 'string' ? result.notaZero.explicacao.slice(0, 2000) : '';

  for (const key of ['c1', 'c2', 'c3', 'c4']) {
    result[key] = result[key] || {};
    result[key].sugerida = normalizeScore(result[key].sugerida);
    result[key].justificativa = typeof result[key].justificativa === 'string' && result[key].justificativa.trim()
      ? result[key].justificativa.slice(0, 2000)
      : 'Avaliação da competência realizada a partir da leitura da imagem.';
    result[key].erros = Array.isArray(result[key].erros) ? result[key].erros.filter(e => typeof e === 'string').slice(0, 12) : [];
    result[key].trechos = Array.isArray(result[key].trechos)
      ? result[key].trechos.filter(t => t && typeof t === 'object').slice(0, 8).map(t => ({
          trecho: typeof t.trecho === 'string' ? t.trecho.slice(0, 2000) : '',
          explicacao: typeof t.explicacao === 'string' ? t.explicacao.slice(0, 2000) : ''
        }))
      : [];
    result[key].orientacao = typeof result[key].orientacao === 'string' ? result[key].orientacao.slice(0, 2000) : '';
  }

  result.c5 = result.c5 || {};
  result.c5.sugerida = normalizeScore(result.c5.sugerida);
  result.c5.justificativa = typeof result.c5.justificativa === 'string' && result.c5.justificativa.trim()
    ? result.c5.justificativa.slice(0, 2000)
    : 'Avaliação da proposta de intervenção realizada a partir da leitura da imagem.';
  result.c5.quadro = result.c5.quadro || {};
  for (const elKey of ['agente', 'acao', 'modo', 'efeito', 'detalhamento']) {
    result.c5.quadro[elKey] = result.c5.quadro[elKey] || {};
    result.c5.quadro[elKey].encontrado = Boolean(result.c5.quadro[elKey].encontrado);
    result.c5.quadro[elKey].trecho = typeof result.c5.quadro[elKey].trecho === 'string' ? result.c5.quadro[elKey].trecho.slice(0, 2000) : '';
    result.c5.quadro[elKey].feedback = typeof result.c5.quadro[elKey].feedback === 'string' ? result.c5.quadro[elKey].feedback.slice(0, 2000) : '';
  }

  result.devolutiva = result.devolutiva || {};
  result.devolutiva.pontosFortes = Array.isArray(result.devolutiva.pontosFortes)
    ? result.devolutiva.pontosFortes.filter(p => typeof p === 'string').slice(0, 12) : [];
  result.devolutiva.precisaMelhorar = Array.isArray(result.devolutiva.precisaMelhorar)
    ? result.devolutiva.precisaMelhorar.filter(p => typeof p === 'string').slice(0, 12) : [];
  
  result.devolutiva.errosCategorizados = result.devolutiva.errosCategorizados || {};
  for (const cat of ['ortografia', 'pontuacao', 'concordancia', 'estrutura', 'argumentacao', 'coesao', 'propostaDeIntervencao']) {
    result.devolutiva.errosCategorizados[cat] = Array.isArray(result.devolutiva.errosCategorizados[cat])
      ? result.devolutiva.errosCategorizados[cat].filter(e => typeof e === 'string').slice(0, 12) : [];
  }

  result.devolutiva.trechosParaRevisar = Array.isArray(result.devolutiva.trechosParaRevisar)
    ? result.devolutiva.trechosParaRevisar.filter(t => t && typeof t === 'object').slice(0, 8).map(t => ({
        original: typeof t.original === 'string' ? t.original.slice(0, 2000) : '',
        problema: typeof t.problema === 'string' ? t.problema.slice(0, 2000) : '',
        orientacao: typeof t.orientacao === 'string' ? t.orientacao.slice(0, 2000) : ''
      }))
    : [];

  result.devolutiva.abordagemTema = result.devolutiva.abordagemTema || {};
  result.devolutiva.abordagemTema.fraseTema = typeof result.devolutiva.abordagemTema.fraseTema === 'string'
    ? result.devolutiva.abordagemTema.fraseTema.slice(0, 2000) : '';

  const validClassificacoes = ['Abordagem completa', 'Tangenciamento', 'Fuga total', 'Pendente'];
  let classif = typeof result.devolutiva.abordagemTema.classificacao === 'string'
    ? result.devolutiva.abordagemTema.classificacao.trim() : 'Abordagem completa';
  if (!validClassificacoes.includes(classif)) {
    const classifLower = classif.toLowerCase();
    if (classifLower.includes('tangen')) classif = 'Tangenciamento';
    else if (classifLower.includes('fuga')) classif = 'Fuga total';
    else classif = 'Abordagem completa';
  }
  result.devolutiva.abordagemTema.classificacao = classif;

  result.devolutiva.abordagemTema.elementosDesenvolvidos = Array.isArray(result.devolutiva.abordagemTema.elementosDesenvolvidos)
    ? result.devolutiva.abordagemTema.elementosDesenvolvidos.filter(e => typeof e === 'string').slice(0, 12) : [];
  result.devolutiva.abordagemTema.recortesAusentes = Array.isArray(result.devolutiva.abordagemTema.recortesAusentes)
    ? result.devolutiva.abordagemTema.recortesAusentes.filter(r => typeof r === 'string').slice(0, 12) : [];

  result.devolutiva.abordagemTema.justificativa = typeof result.devolutiva.abordagemTema.justificativa === 'string' && result.devolutiva.abordagemTema.justificativa.trim()
    ? result.devolutiva.abordagemTema.justificativa.slice(0, 2000)
    : 'Avaliação da abordagem temática com base na leitura da redação.';

  result.devolutiva.abordagemTema.orientacao = typeof result.devolutiva.abordagemTema.orientacao === 'string' && result.devolutiva.abordagemTema.orientacao.trim()
    ? result.devolutiva.abordagemTema.orientacao.slice(0, 2000)
    : 'Desenvolva tanto o tema central quanto seus recortes específicos na argumentação.';

  if (classif === 'Tangenciamento') {
    result.c2.sugerida = 80;
    if (!result.devolutiva.abordagemTema.justificativa.includes('O texto aborda o assunto geral, mas não desenvolve suficientemente o recorte solicitado na proposta')) {
      const recortesStr = result.devolutiva.abordagemTema.recortesAusentes.length > 0
        ? `: ${result.devolutiva.abordagemTema.recortesAusentes.join(', ')}.`
        : '.';
      result.devolutiva.abordagemTema.justificativa = `O texto aborda o assunto geral, mas não desenvolve suficientemente o recorte solicitado na proposta${recortesStr} ${result.devolutiva.abordagemTema.justificativa}`.trim();
    }
  } else if (classif === 'Fuga total') {
    result.c2.sugerida = 0;
    result.notaZero.isZeroRisk = true;
    result.notaZero.motivo = result.notaZero.motivo || 'Fuga total ao tema';
    result.notaZero.explicacao = result.notaZero.explicacao || 'O texto não desenvolve o tema proposto, configurando Fuga Total.';
  }

  const allowedRootKeys = Object.keys(schema.properties);
  for (const k of Object.keys(result)) {
    if (!allowedRootKeys.includes(k)) delete result[k];
  }
}

function validate(value, spec) {
  if (spec.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Objeto inválido');
    if (Object.keys(value).some(k => !spec.properties[k])) throw new Error('Campo inesperado');
    for (const key of spec.required) validate(value[key], spec.properties[key]);
  } else if (spec.type === 'array') {
    if (!Array.isArray(value) || value.length > spec.maxItems) throw new Error('Lista inválida');
    for (const item of value) validate(item, spec.items);
  } else if (spec.type === 'integer') {
    if (!spec.enum.includes(value)) throw new Error('Nota inválida');
  } else if (typeof value !== spec.type || (spec.maxLength && value.length > spec.maxLength)) throw new Error('Campo inválido');
}

export function validateResult(result, transcricao, references, options = {}) {
  if (!result || typeof result !== 'object') throw new Error('Objeto inválido');

  const hasImages = Boolean(
    options?.hasImages ||
    (!references && result?.transcricao && (!transcricao || result.transcricao === transcricao))
  );

  // Caso a foto não possua nitidez suficiente para leitura confiável
  if (result.precisaNovaFoto === true) {
    return makeNovaFotoResult(result);
  }

  // Se for fluxo de imagem, verificar se a transcrição lida tem substância mínima
  if (hasImages) {
    const rawTranscription = typeof result.transcricao === 'string' ? result.transcricao : '';
    const meaningfulText = rawTranscription.replace(/\[trecho ilegível\]/gi, '').replace(/\s+/g, ' ').trim();
    const wordTokens = meaningfulText.match(/[\p{L}\p{N}]+/gu) || [];
    
    // Se a imagem resultou em texto ilegível ou vazio, solicitar nova foto sem atribuir nota zero à aluna
    if (meaningfulText.length < 50 || wordTokens.length < 10) {
      result.precisaNovaFoto = true;
      result.motivoNovaFoto = result.motivoNovaFoto || 'A foto enviada não permitiu uma leitura com nitidez suficiente para avaliar a redação. Por favor, tire outra foto mais nítida, com boa iluminação e enquadrando a folha inteira.';
      return makeNovaFotoResult(result);
    }

    sanitizeImageResult(result);
  }

  // Garante que abordagemTema exista e cumpra a rubrica oficial
  if (result.devolutiva) {
    result.devolutiva.abordagemTema = result.devolutiva.abordagemTema || {
      fraseTema: '',
      classificacao: 'Abordagem completa',
      elementosDesenvolvidos: [],
      recortesAusentes: [],
      justificativa: '',
      orientacao: ''
    };
    if (typeof result.devolutiva.abordagemTema.fraseTema !== 'string') result.devolutiva.abordagemTema.fraseTema = '';
    if (typeof result.devolutiva.abordagemTema.classificacao !== 'string') result.devolutiva.abordagemTema.classificacao = 'Abordagem completa';
    if (!Array.isArray(result.devolutiva.abordagemTema.elementosDesenvolvidos)) result.devolutiva.abordagemTema.elementosDesenvolvidos = [];
    if (!Array.isArray(result.devolutiva.abordagemTema.recortesAusentes)) result.devolutiva.abordagemTema.recortesAusentes = [];
    if (typeof result.devolutiva.abordagemTema.justificativa !== 'string') result.devolutiva.abordagemTema.justificativa = '';
    if (typeof result.devolutiva.abordagemTema.orientacao !== 'string') result.devolutiva.abordagemTema.orientacao = '';

    if (result.devolutiva.abordagemTema.classificacao === 'Tangenciamento') {
      result.c2.sugerida = 80;
      if (result.devolutiva.abordagemTema.justificativa && !result.devolutiva.abordagemTema.justificativa.includes('O texto aborda o assunto geral, mas não desenvolve suficientemente o recorte solicitado na proposta')) {
        const recortesStr = result.devolutiva.abordagemTema.recortesAusentes.length > 0
          ? `: ${result.devolutiva.abordagemTema.recortesAusentes.join(', ')}.`
          : '.';
        result.devolutiva.abordagemTema.justificativa = `O texto aborda o assunto geral, mas não desenvolve suficientemente o recorte solicitado na proposta${recortesStr} ${result.devolutiva.abordagemTema.justificativa}`.trim();
      }
    } else if (result.devolutiva.abordagemTema.classificacao === 'Fuga total') {
      result.c2.sugerida = 0;
      if (result.notaZero) {
        result.notaZero.isZeroRisk = true;
        result.notaZero.motivo = result.notaZero.motivo || 'Fuga total ao tema';
        result.notaZero.explicacao = result.notaZero.explicacao || 'O texto não desenvolve o tema proposto, configurando Fuga Total.';
      }
    }
  }

  // Foto legível: validação do esquema
  validate(result, schema);

  const fullText = (typeof result.transcricao === 'string' && result.transcricao.trim())
    ? result.transcricao.trim()
    : (typeof transcricao === 'string' ? transcricao.trim() : '');

  const excerpt = s => {
    if (references && s) {
      if (!Object.hasOwn(references, s) || !fullText.includes(references[s]))
        throw new Error('Referência de evidência inválida');
      return references[s];
    }
    if (!s || fullText.includes(s)) return s;
    const words = s.trim().split(/\s+/u).filter(Boolean);
    if (words.length > 0) {
      const pattern = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
      const match = fullText.match(new RegExp(pattern, 'u'));
      if (match) return match[0];
    }
    throw new Error('Trecho não encontrado na redação');
  };

  for (const key of ['c1', 'c2', 'c3', 'c4']) {
    if (!result[key].justificativa?.trim()) throw new Error('Justificativa ausente');
    if (hasImages) {
      result[key].trechos = (result[key].trechos || []).map(t => {
        if (!t?.trecho?.trim()) return null;
        const matched = matchImageEvidence(t.trecho, fullText);
        if (!matched) return null;
        return { trecho: matched, explicacao: t.explicacao || '' };
      }).filter(Boolean);
    } else {
      result[key].trechos.forEach(t => {
        if (!t.trecho?.trim()) throw new Error('Trecho vazio');
        t.trecho = excerpt(t.trecho);
      });
    }
  }

  if (!result.c5.justificativa?.trim()) throw new Error('Justificativa ausente');
  for (const el of Object.values(result.c5.quadro)) {
    if (el.encontrado) {
      if (!el.trecho?.trim()) {
        if (hasImages) {
          el.encontrado = false;
          el.trecho = '';
        } else {
          throw new Error('Elemento sem evidência');
        }
      } else {
        if (hasImages) {
          const matched = matchImageEvidence(el.trecho, fullText);
          if (matched) {
            el.trecho = matched;
          } else {
            el.encontrado = false;
            el.trecho = '';
          }
        } else {
          el.trecho = excerpt(el.trecho);
        }
      }
    } else {
      el.trecho = '';
    }
  }

  if (hasImages) {
    result.devolutiva.trechosParaRevisar = (result.devolutiva.trechosParaRevisar || []).map(t => {
      if (!t?.original?.trim()) return null;
      const matched = matchImageEvidence(t.original, fullText);
      if (!matched) return null;
      return { original: matched, problema: t.problema || '', orientacao: t.orientacao || '' };
    }).filter(Boolean);
  } else {
    result.devolutiva.trechosParaRevisar.forEach(t => {
      if (!t.original?.trim()) throw new Error('Trecho vazio');
      t.original = excerpt(t.original);
    });
  }

  if (references && result.notaZero?.evidencia) {
    result.notaZero.evidencia = excerpt(result.notaZero.evidencia);
  } else if (result.notaZero?.isZeroRisk) {
    if (result.notaZero.evidencia?.trim()) {
      if (hasImages) {
        const matched = matchImageEvidence(result.notaZero.evidencia, fullText);
        result.notaZero.evidencia = matched || '';
      } else {
        result.notaZero.evidencia = excerpt(result.notaZero.evidencia);
      }
    } else {
      result.notaZero.evidencia = '';
    }
  } else if (result.notaZero) {
    result.notaZero.evidencia = '';
  }

  return result;
}

export const instruction = `Você é um avaliador pedagógico especialista na correção de redações no modelo oficial do ENEM, em português brasileiro.
Sua tarefa é analisar a redação manuscrita enviada diretamente por foto (ou transcrição), auxiliando a professora na avaliação.

DIRETRIZES FUNDAMENTAIS DE LEITURA E NITIDEZ:
1. Leitura da Imagem: Leia atentamente a caligrafia manuscrita na(s) imagem(ns) da folha de redação. Transcreva o texto completo da redação no campo "transcricao".
2. Nitidez e Trechos Ilegíveis: Quando uma palavra ou trecho estiver ilegível, borrado ou cortado na foto, transcreva como "[trecho ilegível]" e registre a observação em "limitacoesLeitura".
3. NÃO invente palavras, NÃO complete lacunas por adivinhação e NÃO deduza erros gramaticais onde houver apenas falta de nitidez na foto.
4. NÃO penalize a aluna nas notas das competências por problemas de qualidade da imagem, iluminação ou corte da foto.
5. Verificação de Confiabilidade: Se a foto estiver excessivamente escura, cortada, desfocada ou se for impossível ler a maior parte do texto para uma avaliação justa e confiável, marque "precisaNovaFoto": true e descreva o motivo pedagógico em "motivoNovaFoto". Nesse caso, mantenha notas 0 e justificativa orientando a captura de nova foto.
6. Se a imagem permitir a leitura segura da redação, marque "precisaNovaFoto": false e "motivoNovaFoto": "".

AVALIAÇÃO DA ABORDAGEM DO TEMA (TANGENCIAMENTO E PROPOSTA):
1. Comparação com a Proposta:
   - Identifique a frase-tema e seus principais elementos e recortes centrais.
   - Compare esses elementos com a abordagem efetivamente desenvolvida pelo estudante.
   - ATENÇÃO: NÃO considere que apenas mencionar palavras do tema seja suficiente para abordá-lo integralmente.
   - Não deduza a proposta apenas pela redação; utilize estritamente a frase-tema indicada.
2. Classificação da Abordagem em "devolutiva.abordagemTema":
   - "Abordagem completa": desenvolve o tema e seus recortes centrais.
   - "Tangenciamento": desenvolve apenas o assunto mais amplo ou uma parte do tema, deixando de abordar um recorte central da proposta (ex: discute o assunto amplo de meio ambiente sem abordar as comunidades tradicionais no Brasil, ou fala de internet sem abordar o controle de dados).
   - "Fuga total": não desenvolve o tema proposto, tratando de assunto inteiramente desconectado.
3. Cuidados Pedagógicos:
   - NÃO classifique uma argumentação superficial como tangenciamento quando o texto aborda o tema completo. Essa dificuldade deve ser avaliada nas competências pertinentes (C3 e repertório na C2).
   - NÃO confunda tangenciamento com fuga total.
4. Pontuação e Rubrica:
   - O Tangenciamento corresponde ao nível de 80 pontos na Competência II (C2 = 80).
   - O Tangenciamento NÃO anula automaticamente a redação. Continue avaliando as demais competências (C1, C3, C4, C5) normalmente pelas orientações oficiais, sem criar descontos ou limites não previstos.
   - Quando houver Fuga Total inequívoca, aponte risco de nota zero em "notaZero" (isZeroRisk: true) e C2 = 0, explicando a evidência.
   - Se houver Abordagem Completa: C2 deve ser 120, 160 ou 200 pontos conforme a adequação do gênero e repertório legitimado, pertinente e produtivo.
5. Devolutiva de Abordagem do Tema:
   - Em "devolutiva.abordagemTema", preencha:
     * "fraseTema": a frase-tema da redação.
     * "classificacao": "Abordagem completa" | "Tangenciamento" | "Fuga total".
     * "elementosDesenvolvidos": lista dos elementos do tema que foram efetivamente desenvolvidos.
     * "recortesAusentes": lista dos recortes da proposta ausentes ou abordados apenas parcialmente.
     * "justificativa": justificativa baseada em trechos legíveis da redação. Em caso de tangenciamento, formule de maneira respeitosa iniciando com:
       "O texto aborda o assunto geral, mas não desenvolve suficientemente o recorte solicitado na proposta: [especificar o recorte ausente]." (Não use essa frase de forma genérica sem analisar o texto).
     * "orientacao": orientação pedagógica objetiva para o estudante aproximar sua argumentação da proposta nas próximas produções.

AVALIAÇÃO DAS CINCO COMPETÊNCIAS (Notas discretas: 0, 40, 80, 120, 160, 200):
- C1: Domínio da modalidade escrita formal da Língua Portuguesa.
- C2: Compreensão da proposta de redação e aplicação de conceitos das várias áreas do conhecimento (Tangenciamento = 80; Abordagem completa = 120, 160 ou 200).
- C3: Seleção, relação, organização e interpretação de informações, fatos e argumentos em defesa de ponto de vista.
- C4: Mecanismos linguísticos de coesão referencial e sequencial.
- C5: Proposta de intervenção com os 5 elementos (agente, ação, modo, efeito e detalhamento). Violação de direitos humanos zera apenas a C5.

REGRAS PEDAGÓGICAS E EVIDÊNCIAS:
- Nunca anule automaticamente a redação inteira sem fundamento: apenas se houver fuga total ao tema ou não atendimento ao gênero.
- As evidências em "trechos", "quadro" e "trechosParaRevisar" devem ser transcrições literais do texto da redação.
- Forneça feedback construtivo na devolutiva: pontos fortes, aspectos a aprimorar, erros categorizados e orientações claras de reescrita.
- A avaliação gerada é uma sugestão de apoio técnico-pedagógico à professora, que revisará e validará cada nota. Responda estritamente no formato JSON solicitado.`;
