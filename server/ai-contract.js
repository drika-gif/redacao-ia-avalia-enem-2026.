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
    trechosParaRevisar: { type: 'array', maxItems: 8, items: object({ original: text, problema: text, orientacao: text }) }
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

export function validateResult(result, transcricao, references) {
  if (!result || typeof result !== 'object') throw new Error('Objeto inválido');

  // Caso a foto não possua nitidez suficiente para leitura confiável
  if (result.precisaNovaFoto === true) {
    if (typeof result.motivoNovaFoto !== 'string' || !result.motivoNovaFoto.trim()) {
      result.motivoNovaFoto = 'A foto enviada não permitiu uma avaliação confiável. Por favor, tire outra foto mais nítida e iluminada.';
    }
    result.transcricao = typeof result.transcricao === 'string' ? result.transcricao : '';
    result.limitacoesLeitura = typeof result.limitacoesLeitura === 'string' ? result.limitacoesLeitura : result.motivoNovaFoto;
    result.notaZero = result.notaZero || { isZeroRisk: false, motivo: '', evidencia: '', explicacao: '' };
    for (const key of ['c1', 'c2', 'c3', 'c4']) {
      result[key] = result[key] || { sugerida: 0, justificativa: result.motivoNovaFoto, erros: [], trechos: [], orientacao: 'Capture uma nova foto da redação.' };
    }
    result.c5 = result.c5 || {
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
    result.devolutiva = result.devolutiva || {
      pontosFortes: [], precisaMelhorar: ['Enviar nova foto da redação com boa nitidez e iluminação.'],
      errosCategorizados: { ortografia: [], pontuacao: [], concordancia: [], estrutura: [], argumentacao: [], coesao: [], propostaDeIntervencao: [] },
      trechosParaRevisar: []
    };
    return result;
  }

  // Foto legível: validação completa do esquema
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
    result[key].trechos.forEach(t => {
      if (!t.trecho?.trim()) throw new Error('Trecho vazio');
      t.trecho = excerpt(t.trecho);
    });
  }
  if (!result.c5.justificativa?.trim()) throw new Error('Justificativa ausente');
  for (const el of Object.values(result.c5.quadro)) {
    if (el.encontrado && !el.trecho?.trim()) throw new Error('Elemento sem evidência');
    el.trecho = excerpt(el.trecho);
  }
  result.devolutiva.trechosParaRevisar.forEach(t => {
    if (!t.original?.trim()) throw new Error('Trecho vazio');
    t.original = excerpt(t.original);
  });
  result.notaZero.evidencia = excerpt(result.notaZero.evidencia);

  return result;
}

export const instruction = `Você é um avaliador pedagógico especialista na correção de redações no modelo oficial do ENEM, em português brasileiro.
Sua tarefa é analisar a redação manuscrita enviada diretamente por foto (ou transcrição), auxiliando a professora na avaliação.

DIRETRIZES FUNDAMENTAIS DE LEITURA E NITIDEZ:
1. Leitura da Imagem: Leia atentamente a caligrafia manuscrita na(s) imagem(ns) da folha de redação. Transcreva o texto completo da redação no campo "transcricao".
2. Nitidez e Trechos Ilegíveis: Quando uma palavra ou trecho estiver ilegível, borrado ou cortado na foto, transcreva como "[trecho ilegível]" e registre a observação em "limitacoesLeitura".
3. NÃO invente palavras, NÃO complete lacunas por adivinhação e NÃO deduza erros gramaticais onde houver apenas falta de nitidez na foto.
4. NÃO penalize a aluna nas notas das competências por problemas de qualidade da imagem, iluminação ou corte da foto.
5. Verificação de Confiabilidade: Se a foto estiver excessivamente escura, cortada, desfocada ou se for impossível ler a maior parte do texto para uma avaliação justa e confiável, marque "precisaNovaFoto": true e descreva o motivo pedagógico em "motivoNovaFoto" (ex: "A foto está muito borrada e cortada nas margens, impedindo a leitura confiável dos parágrafos"). Nesse caso, mantenha notas 0 e justificativa orientando a captura de nova foto.
6. Se a imagem permitir a leitura segura da redação, marque "precisaNovaFoto": false e "motivoNovaFoto": "".

AVALIAÇÃO DAS CINCO COMPETÊNCIAS (Notas discretas: 0, 40, 80, 120, 160, 200):
- C1: Domínio da modalidade escrita formal da Língua Portuguesa (ortografia, concordância, regência, pontuação, sintaxe). Avalie apenas erros claramente visíveis; não assuma erro em trechos ilegíveis.
- C2: Compreensão da proposta de redação e aplicação de conceitos das várias áreas do conhecimento dentro dos limites do texto dissertativo-argumentativo. Repertório legítimo, pertinente e produtivo.
- C3: Seleção, relação, organização e interpretação de informações, fatos, opiniões e argumentos em defesa de um ponto de vista. Autoria e coerência no projeto de texto.
- C4: Demonstração de conhecimento dos mecanismos linguísticos necessários para a construção da argumentação (coesão referencial e sequencial, conectivos inter e intraparágrafos).
- C5: Elaboração de proposta de intervenção para a problemática abordada, respeitando os direitos humanos. Analise os 5 elementos: agente, ação, modo/meio, efeito e detalhamento de um dos anteriores. Violação aos direitos humanos zera apenas a C5.

REGRAS PEDAGÓGICAS E EVIDÊNCIAS:
- Nunca anule automaticamente a redação inteira: aponte risco de nota zero em "notaZero" somente se houver fundamento legítimo como fuga total ao tema ou não atendimento ao tipo dissertativo-argumentativo. A decisão final cabe à professora.
- As evidências e trechos citados em "trechos", "quadro" e "trechosParaRevisar" devem ser transcrições literais do texto da redação.
- Forneça feedback construtivo na devolutiva: pontos fortes, aspectos a aprimorar, erros categorizados e orientações claras de reescrita.
- A avaliação gerada é uma sugestão de apoio técnico-pedagógico à professora, que revisará e validará cada nota. Responda estritamente no formato JSON solicitado.`;
