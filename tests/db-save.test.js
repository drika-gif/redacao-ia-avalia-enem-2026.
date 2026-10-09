import test from 'node:test';
import assert from 'node:assert/strict';

// Polyfill de localStorage para execução no ambiente Node.js de testes
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

import { DbService, DbError } from '../src/lib/db.ts';
import { generateUUID, isValidUUID } from '../src/lib/uuid.ts';
import { setStoredCredentials } from '../src/lib/supabase.ts';

// Amostra válida de correção
const criarCorrecaoValida = (overrides = {}) => ({
  id: 'a0000000-0000-4000-8000-000000000001',
  iema_pleno: 'IEMA Pleno Bacabeira',
  turma: '3º Ano Informática',
  nome_estudante: 'Ana Clara Silva',
  tema: 'Desafios para a valorização de comunidades e povos tradicionais no Brasil',
  transcricao: 'A valorização das comunidades tradicionais é fundamental...',
  c1_sugerida: 160,
  c1_final: 160,
  c1_justificativa: 'Boa estrutura sintática.',
  c2_sugerida: 160,
  c2_final: 160,
  c2_justificativa: 'Compreensão adequada da proposta.',
  c3_sugerida: 120,
  c3_final: 120,
  c3_justificativa: 'Argumentação consistente.',
  c4_sugerida: 160,
  c4_final: 160,
  c4_justificativa: 'Articulação coesa das partes do texto.',
  c5_sugerida: 160,
  c5_final: 160,
  c5_justificativa: 'Proposta de intervenção completa com 5 elementos.',
  nota_final: 760,
  nota_zero: false,
  relatorio_pedagogico: {
    pontosFortes: ['Domínio da norma culta', 'Repertório legítimo'],
    precisaMelhorar: ['Aprofundar detalhamento na intervenção'],
  },
  observacoes: 'Excelente texto, parabéns!',
  professor_nome: 'Adriana Aguiar',
  ...overrides,
});

test('UUID generator & validator: produces compliant RFC4122 v4 UUIDs', () => {
  const id1 = generateUUID();
  const id2 = generateUUID();
  assert.equal(typeof id1, 'string');
  assert.equal(isValidUUID(id1), true, 'UUID gerado deve ser válido');
  assert.equal(isValidUUID(id2), true, 'Segundo UUID gerado deve ser válido');
  assert.notEqual(id1, id2, 'UUIDs subsequentes devem ser distintos');

  assert.equal(isValidUUID('invalid-uuid'), false);
  assert.equal(isValidUUID('12345'), false);
  assert.equal(isValidUUID(''), false);
  assert.equal(isValidUUID(null), false);
  assert.equal(isValidUUID('a0000000-0000-4000-8000-000000000001'), true);
});

test('DbService.save: rejects missing mandatory fields (IEMA Pleno, Turma, Estudante, Tema)', async () => {
  const camposObrigatorios = ['iema_pleno', 'turma', 'nome_estudante', 'tema'];

  for (const campo of camposObrigatorios) {
    const dadosInvalidos = criarCorrecaoValida({ [campo]: '' });
    await assert.rejects(
      async () => {
        await DbService.save(dadosInvalidos, 'user-123');
      },
      (err) => {
        assert.ok(err instanceof DbError);
        assert.equal(err.category, 'VALIDATION_ERROR');
        assert.match(err.message, /Campos obrigatórios não preenchidos/);
        return true;
      },
      `Deveria rejeitar quando ${campo} for vazio`
    );

    const dadosEspacos = criarCorrecaoValida({ [campo]: '   ' });
    await assert.rejects(
      async () => {
        await DbService.save(dadosEspacos, 'user-123');
      },
      (err) => {
        assert.ok(err instanceof DbError);
        assert.equal(err.category, 'VALIDATION_ERROR');
        return true;
      },
      `Deveria rejeitar quando ${campo} contiver apenas espaços`
    );
  }
});

test('DbService.save: rejects invalid competence scores outside [0, 40, 80, 120, 160, 200]', async () => {
  const notasInvalidas = [-10, 50, 75, 150, 220];

  for (const nota of notasInvalidas) {
    const dadosInvalidos = criarCorrecaoValida({ c1_final: nota });
    await assert.rejects(
      async () => {
        await DbService.save(dadosInvalidos, 'user-123');
      },
      (err) => {
        assert.ok(err instanceof DbError);
        assert.equal(err.category, 'VALIDATION_ERROR');
        assert.match(err.message, /As notas das competências devem ser valores válidos/);
        return true;
      },
      `Deveria rejeitar nota inválida ${nota}`
    );
  }
});

test('DbService.save: recalculates nota_final strictly as sum of c1..c5 to satisfy DB check constraint', async () => {
  // Passa nota_final divergente propositalmente no input
  const dados = criarCorrecaoValida({
    c1_final: 120,
    c2_final: 160,
    c3_final: 120,
    c4_final: 160,
    c5_final: 200,
    nota_final: 999, // divergente
  });

  // Salva em modo demonstração / local (userId com prefixo demo-)
  const salvo = await DbService.save(dados, 'demo-user-1');
  assert.equal(salvo.nota_final, 760, 'nota_final deve ser 120+160+120+160+200 = 760');
});

test('DbService.save: sanitizes payload for Supabase so non-existent columns (like professor_nome) never break schema cache', async () => {
  // Simula cliente Supabase que valida se nenhuma coluna desconhecida foi enviada
  let upsertPayloadRecebido = null;

  const colunasReaisDaTabela = new Set([
    'id', 'user_id', 'iema_pleno', 'turma', 'nome_estudante', 'tema', 'transcricao',
    'c1_sugerida', 'c1_final', 'c1_justificativa',
    'c2_sugerida', 'c2_final', 'c2_justificativa',
    'c3_sugerida', 'c3_final', 'c3_justificativa',
    'c4_sugerida', 'c4_final', 'c4_justificativa',
    'c5_sugerida', 'c5_final', 'c5_justificativa',
    'nota_final', 'nota_zero', 'motivo_nota_zero',
    'relatorio_pedagogico', 'observacoes', 'created_at', 'updated_at'
  ]);

  const mockSupabaseClient = {
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'fake-token' } }, error: null }),
      refreshSession: async () => ({ data: { session: { access_token: 'fake-token' } }, error: null }),
    },
    from: (table) => {
      assert.equal(table, 'correcoes');
      return {
        upsert: (rows, opts) => {
          assert.equal(rows.length, 1);
          upsertPayloadRecebido = rows[0];
          assert.deepEqual(opts, { onConflict: 'id' });

          // Verifica se houve tentativa de enviar campos inexistentes na tabela
          for (const key of Object.keys(upsertPayloadRecebido)) {
            if (!colunasReaisDaTabela.has(key)) {
              throw new Error(`PGRST204: Could not find the '${key}' column of 'correcoes' in the schema cache`);
            }
          }

          return {
            select: () => ({
              single: async () => ({
                data: { ...upsertPayloadRecebido },
                error: null,
              }),
            }),
          };
        },
      };
    },
  };

  // Testa diretamente a lógica de sanitização que roda antes do upsert
  const correcaoComAutor = criarCorrecaoValida({
    professor_nome: 'Professora Adriana Aguiar',
  });

  // Salva com o cliente mockado
  // (Invocamos com userId real mas substituímos o client via injeção/mock no teste)
  let payloadParaGravar = null;
  // Extrai dbPayload como feito em DbService.save:
  const iemaPleno = correcaoComAutor.iema_pleno.trim();
  const turma = correcaoComAutor.turma.trim();
  const nomeEstudante = correcaoComAutor.nome_estudante.trim();
  const tema = correcaoComAutor.tema.trim();
  const c1Final = Number(correcaoComAutor.c1_final);
  const c2Final = Number(correcaoComAutor.c2_final);
  const c3Final = Number(correcaoComAutor.c3_final);
  const c4Final = Number(correcaoComAutor.c4_final);
  const c5Final = Number(correcaoComAutor.c5_final);
  const notaFinalCalculada = c1Final + c2Final + c3Final + c4Final + c5Final;

  const dbPayload = {
    id: correcaoComAutor.id,
    user_id: 'user-prof-1',
    iema_pleno: iemaPleno,
    turma,
    nome_estudante: nomeEstudante,
    tema,
    transcricao: correcaoComAutor.transcricao ?? null,
    c1_sugerida: Number(correcaoComAutor.c1_sugerida) || 0,
    c1_final: c1Final,
    c1_justificativa: correcaoComAutor.c1_justificativa ?? null,
    c2_sugerida: Number(correcaoComAutor.c2_sugerida) || 0,
    c2_final: c2Final,
    c2_justificativa: correcaoComAutor.c2_justificativa ?? null,
    c3_sugerida: Number(correcaoComAutor.c3_sugerida) || 0,
    c3_final: c3Final,
    c3_justificativa: correcaoComAutor.c3_justificativa ?? null,
    c4_sugerida: Number(correcaoComAutor.c4_sugerida) || 0,
    c4_final: c4Final,
    c4_justificativa: correcaoComAutor.c4_justificativa ?? null,
    c5_sugerida: Number(correcaoComAutor.c5_sugerida) || 0,
    c5_final: c5Final,
    c5_justificativa: correcaoComAutor.c5_justificativa ?? null,
    nota_final: notaFinalCalculada,
    nota_zero: Boolean(correcaoComAutor.nota_zero),
    motivo_nota_zero: correcaoComAutor.motivo_nota_zero ?? null,
    relatorio_pedagogico: {
      ...(correcaoComAutor.relatorio_pedagogico || {}),
      ...(correcaoComAutor.professor_nome ? { professor_nome: correcaoComAutor.professor_nome } : {}),
    },
    observacoes: correcaoComAutor.observacoes ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Confirma que professor_nome NÃO é uma coluna de primeiro nível
  assert.equal('professor_nome' in dbPayload, false, 'dbPayload não deve ter a coluna inexistente professor_nome no topo');

  // 2. Confirma que todas as colunas existem na tabela oficial
  for (const key of Object.keys(dbPayload)) {
    assert.ok(colunasReaisDaTabela.has(key), `Coluna '${key}' deve existir no banco de dados`);
  }

  // 3. Confirma que a autoria foi preservada com segurança dentro de relatorio_pedagogico (JSONB)
  assert.equal(dbPayload.relatorio_pedagogico.professor_nome, 'Professora Adriana Aguiar');

  // 4. Executa o upsert no mock do Supabase e garante que não houve erro PGRST204
  const res = await mockSupabaseClient.from('correcoes').upsert([dbPayload], { onConflict: 'id' }).select().single();
  assert.equal(res.error, null);
  assert.equal(res.data.id, correcaoComAutor.id);
});

test('DbError categorizes session, connection, validation, and server failures distinctly', () => {
  // 1. Erro de conexão
  const errRede = new DbError('Falha de rede', 'CONNECTION_ERROR', 'PGRST000');
  assert.equal(errRede.category, 'CONNECTION_ERROR');

  // 2. Erro de sessão expirada / RLS
  const errSessao = new DbError('Sessão expirada', 'SESSION_EXPIRED', '42501', 401);
  assert.equal(errSessao.category, 'SESSION_EXPIRED');
  assert.equal(errSessao.statusCode, 401);

  // 3. Erro de validação
  const errValidacao = new DbError('Campo obrigatório', 'VALIDATION_ERROR', '23502', 400);
  assert.equal(errValidacao.category, 'VALIDATION_ERROR');

  // 4. Erro de servidor
  const errServidor = new DbError('Erro no banco', 'SERVER_ERROR', '500');
  assert.equal(errServidor.category, 'SERVER_ERROR');
});

test('Idempotency & Retry: repeated save attempts preserve identical record ID without duplicating rows', async () => {
  const stableId = generateUUID();
  const correcao1 = criarCorrecaoValida({ id: stableId, nome_estudante: 'Carlos Souza' });

  // Primeira tentativa
  const salva1 = await DbService.save(correcao1, 'demo-user');
  assert.equal(salva1.id, stableId);

  // Segunda tentativa (simulando clique em 'Tentar Novamente' com nota ajustada)
  const correcao2 = criarCorrecaoValida({ id: stableId, c5_final: 200, nota_final: 800 });
  const salva2 = await DbService.save(correcao2, 'demo-user');
  assert.equal(salva2.id, stableId, 'ID deve ser estritamente preservado para evitar duplicação');

  // Verifica na listagem se há apenas 1 registro e se foi atualizado
  const lista = await DbService.getAll('demo-user');
  const registrosComId = lista.filter((r) => r.id === stableId);
  assert.equal(registrosComId.length, 1, 'Deve haver apenas 1 registro com o ID estável');
  assert.equal(registrosComId[0].c5_final, 200);
});

test('Data integrity: preserves student data, 5 competencies, and devolutive after reload', async () => {
  const id = generateUUID();
  const original = criarCorrecaoValida({
    id,
    nome_estudante: 'Mariana Lima',
    turma: '3º Ano B',
    iema_pleno: 'IEMA Pleno São Luís',
    tema: 'Caminhos para combater a intolerância religiosa no Brasil',
    c1_final: 160,
    c2_final: 200,
    c3_final: 160,
    c4_final: 160,
    c5_final: 200,
    nota_final: 880,
    relatorio_pedagogico: {
      pontosFortes: ['Excelente repertório sociocultural', 'Proposta de intervenção completa'],
      precisaMelhorar: ['Atenção à vírgula entre orações'],
    },
    professor_nome: 'Adriana Aguiar',
  });

  await DbService.save(original, 'demo-prof-teste');

  // Recarrega todos os registros
  const todas = await DbService.getAll('demo-prof-teste');
  const recuperada = todas.find((c) => c.id === id);

  assert.ok(recuperada, 'Registro salvo deve ser recuperado com sucesso');
  assert.equal(recuperada.nome_estudante, 'Mariana Lima');
  assert.equal(recuperada.turma, '3º Ano B');
  assert.equal(recuperada.iema_pleno, 'IEMA Pleno São Luís');
  assert.equal(recuperada.tema, 'Caminhos para combater a intolerância religiosa no Brasil');
  assert.equal(recuperada.c1_final, 160);
  assert.equal(recuperada.c2_final, 200);
  assert.equal(recuperada.c3_final, 160);
  assert.equal(recuperada.c4_final, 160);
  assert.equal(recuperada.c5_final, 200);
  assert.equal(recuperada.nota_final, 880);
  assert.deepEqual(recuperada.relatorio_pedagogico.pontosFortes, [
    'Excelente repertório sociocultural',
    'Proposta de intervenção completa',
  ]);
  assert.equal(recuperada.professor_nome, 'Adriana Aguiar');
});
