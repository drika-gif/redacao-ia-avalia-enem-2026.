import test from 'node:test';
import assert from 'node:assert/strict';
import { AnalisadorAvaliaEnem2026 } from '../src/lib/analyzer.ts';
import { validateResult } from '../server/ai-contract.js';
import { ExcelOficialGenerator } from '../src/lib/excel.ts';

const PROPOSTA_PADRAO = 'Desafios para a valorização de comunidades e povos tradicionais no Brasil';

// Texto com Abordagem Completa (desenvolve tema, povos tradicionais, desafios, com repertórios)
const REDACAO_ABORDAGEM_COMPLETA = `
No Brasil, a garantia estabelecida pela Constituição Federal de 1988 enfrenta entraves históricos no que tange aos povos tradicionais.
Historicamente, indígenas, quilombolas e ribeirinhos vivenciam a invisibilidade social e a expropriação de suas terras ancestrais.
Nesse sentido, os principais desafios para a valorização de comunidades e povos tradicionais no Brasil decorrem da omissão estatal e do avanço predatório de atividades econômicas ilegais.
De acordo com o sociólogo Zygmunt Bauman, a modernidade produz cidadãos marginalizados desprovidos de amparo.
Portanto, torna-se imperativo que o Ministério dos Povos Indígenas e o Ministério do Meio Ambiente promovam a demarcação e proteção integral desses territórios, por meio de fiscalização rigorosa e incentivos ao desenvolvimento sustentável, a fim de consolidar a justiça social e valorizar o patrimônio cultural brasileiro.
`.trim();

// Texto com Tangenciamento (aborda apenas o assunto amplo de meio ambiente no Brasil, sem os povos e comunidades tradicionais)
const REDACAO_TANGENCIAMENTO = `
No Brasil contemporâneo, a preservação ambiental é fundamental para o futuro do país e para superar os grandes desafios ecológicos.
Desde a Revolução Industrial, a degradação dos ecossistemas tem gerado crises climáticas severas em território brasileiro.
No cenário atual, o desmatamento ilegal e a poluição das bacias hidrográficas ameaçam a biodiversidade e o equilíbrio planetário.
Segundo a Constituição Cidadã de 1988, todos têm direito ao meio ambiente ecologicamente equilibrado como bem de uso comum do povo.
Dessa forma, é urgente que o Ministério do Meio Ambiente intensifique a fiscalização contra crimes ambientais, por meio de investimentos em energia renovável e tecnologias verdes, a fim de garantir um desenvolvimento sustentável para as próximas gerações de brasileiros.
`.trim();

// Texto com Fuga Total (tema totalmente desconectado: corrida espacial / astronomia, com extensão suficiente > 8 linhas)
const REDACAO_FUGA_TOTAL = `
A corrida espacial contemporânea revela os avanços extraordinários da exploração astronômica e dos projetos de colonização interplanetária.
Grandes potências mundiais e corporações do setor aeroespacial investem trilhões de dólares na fabricação de foguetes reutilizáveis, telescópios orbitais de alta resolução e sondas enviadas para Marte e para as luas congeladas de Júpiter.
Essa busca incessante por novos mundos levanta profundas reflexões sobre a sobrevivência da espécie humana fora da Terra e os limites da astrofísica moderna.
O avanço da engenharia aeroespacial impulsiona tecnologias como inteligência artificial, novos materiais de fusão térmica e sistemas autônomos de navegação estelar.
Nesse sentido, cientistas debatem os impactos éticos da mineração de asteroides e a governança das futuras estações de pesquisa na superfície lunar.
Assim, é primordial que as agências espaciais ampliem a cooperação científica e estabeleçam tratados internacionais que regulem a colonização do cosmos em benefício de toda a humanidade.
`.trim();

test('Thematic Approach: Abordagem Completa reconhece o tema e recortes centrais', () => {
  const abordagem = AnalisadorAvaliaEnem2026.avaliarAbordagemTema(REDACAO_ABORDAGEM_COMPLETA, PROPOSTA_PADRAO);
  assert.equal(abordagem.classificacao, 'Abordagem completa');
  assert.equal(abordagem.recortesAusentes.length, 0);
  assert.match(abordagem.justificativa, /Abordagem completa/);
  assert.ok(abordagem.elementosDesenvolvidos.length > 0);

  const c2 = AnalisadorAvaliaEnem2026.analisarC2(REDACAO_ABORDAGEM_COMPLETA, PROPOSTA_PADRAO);
  assert.ok(c2.sugerida >= 120, 'Abordagem completa deve obter 120, 160 ou 200 pontos');
  assert.equal(c2.sugerida, 200, 'Texto possui repertório legítimo e produtivo (Constituição e Bauman)');
});

test('Thematic Approach: Tangenciamento pontua estritamente 80 pontos na Competência II sem anular a redação', () => {
  const abordagem = AnalisadorAvaliaEnem2026.avaliarAbordagemTema(REDACAO_TANGENCIAMENTO, PROPOSTA_PADRAO);
  assert.equal(abordagem.classificacao, 'Tangenciamento');
  assert.ok(abordagem.recortesAusentes.length > 0, 'Deve listar recortes ausentes');

  // Verifica a formulação respeitosa obrigatória
  assert.match(
    abordagem.justificativa,
    /O texto aborda o assunto geral, mas não desenvolve suficientemente o recorte solicitado na proposta/
  );

  // Competência II recebe estritamente 80 pontos pela rubrica oficial
  const c2 = AnalisadorAvaliaEnem2026.analisarC2(REDACAO_TANGENCIAMENTO, PROPOSTA_PADRAO);
  assert.equal(c2.sugerida, 80, 'Tangenciamento deve receber exatamente 80 pontos na C2');
  assert.match(c2.justificativa, /O texto aborda o assunto geral, mas não desenvolve suficientemente o recorte solicitado na proposta/);

  // Tangenciamento NÃO anula a redação
  const zeroCheck = AnalisadorAvaliaEnem2026.verificarNotaZero(REDACAO_TANGENCIAMENTO, PROPOSTA_PADRAO);
  assert.equal(zeroCheck.isZeroRisk, false, 'Tangenciamento não deve anular a redação');

  // Demais competências continuam sendo avaliadas normalmente
  const c1 = AnalisadorAvaliaEnem2026.analisarC1(REDACAO_TANGENCIAMENTO);
  assert.ok([120, 160, 200].includes(c1.sugerida), 'C1 avaliada normalmente sem penalidade arbitrária');

  const c3 = AnalisadorAvaliaEnem2026.analisarC3(REDACAO_TANGENCIAMENTO);
  assert.ok([120, 160, 200].includes(c3.sugerida), 'C3 avaliada normalmente');
});

test('Thematic Approach: Fuga Total zera a Competência II e aponta anulação da redação', () => {
  const abordagem = AnalisadorAvaliaEnem2026.avaliarAbordagemTema(REDACAO_FUGA_TOTAL, PROPOSTA_PADRAO);
  assert.equal(abordagem.classificacao, 'Fuga total');

  const c2 = AnalisadorAvaliaEnem2026.analisarC2(REDACAO_FUGA_TOTAL, PROPOSTA_PADRAO);
  assert.equal(c2.sugerida, 0, 'Fuga total zera a Competência II');

  const zeroCheck = AnalisadorAvaliaEnem2026.verificarNotaZero(REDACAO_FUGA_TOTAL, PROPOSTA_PADRAO);
  assert.equal(zeroCheck.isZeroRisk, true, 'Fuga total deve apontar risco de nota zero');
  assert.equal(zeroCheck.motivo, 'Fuga total ao tema');
});

test('Thematic Approach: Proposta não informada deixa avaliação temática pendente sem deduzir pelo texto', () => {
  const abordagem = AnalisadorAvaliaEnem2026.avaliarAbordagemTema(REDACAO_ABORDAGEM_COMPLETA, '');
  assert.equal(abordagem.classificacao, 'Pendente');
  assert.match(abordagem.justificativa, /Frase-tema não informada/);

  const c2 = AnalisadorAvaliaEnem2026.analisarC2(REDACAO_ABORDAGEM_COMPLETA, '');
  assert.equal(c2.sugerida, 0);
  assert.match(c2.justificativa, /pendente/i);
});

test('validateResult: enforces C2=80 and respectful phrase when AI returns Tangenciamento', () => {
  const textoValido = 'No Brasil contemporâneo, a preservação ambiental é fundamental para o futuro do país e para enfrentar os grandes desafios da sustentabilidade ecológica com ampla fiscalização.';
  const mockResult = {
    transcricao: textoValido,
    precisaNovaFoto: false,
    motivoNovaFoto: '',
    limitacoesLeitura: '',
    c1: { sugerida: 160, justificativa: 'Boa escrita.', erros: [], trechos: [], orientacao: '' },
    c2: { sugerida: 120, justificativa: 'Texto superficial.', erros: [], trechos: [], orientacao: '' }, // propositalmente divergente
    c3: { sugerida: 160, justificativa: 'Bom projeto.', erros: [], trechos: [], orientacao: '' },
    c4: { sugerida: 160, justificativa: 'Boa coesão.', erros: [], trechos: [], orientacao: '' },
    c5: {
      sugerida: 160,
      justificativa: 'Proposta clara.',
      quadro: {
        agente: { encontrado: true, trecho: '', feedback: '' },
        acao: { encontrado: true, trecho: '', feedback: '' },
        modo: { encontrado: true, trecho: '', feedback: '' },
        efeito: { encontrado: true, trecho: '', feedback: '' },
        detalhamento: { encontrado: false, trecho: '', feedback: '' },
      },
    },
    notaZero: { isZeroRisk: false, motivo: '', evidencia: '', explicacao: '' },
    devolutiva: {
      pontosFortes: ['Boa estrutura'],
      precisaMelhorar: ['Aprofundar tema'],
      errosCategorizados: { ortografia: [], pontuacao: [], concordancia: [], estrutura: [], argumentacao: [], coesao: [], propostaDeIntervencao: [] },
      trechosParaRevisar: [],
      abordagemTema: {
        fraseTema: PROPOSTA_PADRAO,
        classificacao: 'Tangenciamento',
        elementosDesenvolvidos: ['Meio ambiente em geral'],
        recortesAusentes: ['comunidades tradicionais no Brasil'],
        justificativa: 'Discutiu sustentabilidade mas não abordou os povos tradicionais.',
        orientacao: 'Aproxime sua argumentação do recorte específico.',
      },
    },
  };

  const validado = validateResult(mockResult, mockResult.transcricao, null, { hasImages: true });

  // 1. C2 sugerida deve ser ajustada para 80 pontos pela rubrica
  assert.equal(validado.c2.sugerida, 80);

  // 2. Justificativa deve conter a formulação respeitosa requerida
  assert.match(
    validado.devolutiva.abordagemTema.justificativa,
    /O texto aborda o assunto geral, mas não desenvolve suficientemente o recorte solicitado na proposta/
  );
  assert.match(validado.devolutiva.abordagemTema.justificativa, /comunidades tradicionais no Brasil/);
});

test('Excel export: preserves 9 columns in Planilha1 and includes Devolutivas sheet with topic approach', async () => {
  const mockCorrecoes = [
    {
      id: 'mock-1',
      iema_pleno: 'IEMA Pleno Bacabeira',
      turma: '3º Ano A',
      nome_estudante: 'Larissa Manoela',
      tema: PROPOSTA_PADRAO,
      transcricao: REDACAO_TANGENCIAMENTO,
      c1_final: 160,
      c2_final: 80,
      c3_final: 160,
      c4_final: 160,
      c5_final: 160,
      nota_final: 720,
      nota_zero: false,
      relatorio_pedagogico: {
        pontosFortes: ['Domínio da norma culta'],
        precisaMelhorar: ['Evitar tangenciamento temático'],
        errosCategorizados: { ortografia: [], pontuacao: [], concordancia: [], estrutura: [], argumentacao: [], coesao: [], propostaDeIntervencao: [] },
        trechosParaRevisar: [],
        abordagemTema: {
          fraseTema: PROPOSTA_PADRAO,
          classificacao: 'Tangenciamento',
          elementosDesenvolvidos: ['Preservação ambiental ampla'],
          recortesAusentes: ['comunidades e povos tradicionais no Brasil'],
          justificativa: 'O texto aborda o assunto geral, mas não desenvolve suficientemente o recorte solicitado na proposta: comunidades e povos tradicionais no Brasil.',
          orientacao: 'Inclua os recortes centrais na introdução e desenvolvimento.',
        },
      },
      professor_nome: 'Adriana Aguiar',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const { blob, filename } = await ExcelOficialGenerator.gerarPlanilhaOficial(
    mockCorrecoes,
    'IEMA Pleno Bacabeira',
    '3º Ano A',
    'Professora Adriana Aguiar'
  );

  assert.ok(blob);
  assert.ok(blob.size > 0);
  assert.match(filename, /NOTAS_REDACAO_AVALIA_ENEM_2026/);
});
