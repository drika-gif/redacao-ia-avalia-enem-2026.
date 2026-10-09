import type { Correcao } from '../types/index.ts';
import { supabase, getSupabaseClient } from './supabase.ts';
import { generateUUID, isValidUUID } from './uuid.ts';

const LOCAL_STORAGE_KEY = 'redacao_ia_correcoes_cache';

export type DbErrorCategory =
  | 'CONNECTION_ERROR'
  | 'SESSION_EXPIRED'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR';

export class DbError extends Error {
  category: DbErrorCategory;
  code?: string;
  statusCode?: number;

  constructor(message: string, category: DbErrorCategory, code?: string, statusCode?: number) {
    super(message);
    this.name = 'DbError';
    this.category = category;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class DbService {
  /**
   * Obtém todas as correções pertencentes à usuária atual.
   * Supabase RLS garante que nenhuma professora acesse dados de outra.
   */
  static async getAll(userId: string | null): Promise<Correcao[]> {
    const client = getSupabaseClient() || supabase;

    // 1. Tenta buscar do Supabase se autenticado
    if (client && userId && !userId.startsWith('demo-')) {
      try {
        const { data, error } = await client
          .from('correcoes')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const formatados = data.map((item: any) => ({
            ...item,
            professor_nome: item.professor_nome || item.relatorio_pedagogico?.professor_nome || '',
          }));
          // Atualiza o cache local
          this.salvarCacheLocal(formatados, userId);
          return formatados as Correcao[];
        }
      } catch (err) {
        console.warn('Supabase offline ou inacessível, utilizando cache local:', err);
      }
    }

    // 2. Fallback: Lê do cache local (filtrado por userId)
    return this.lerCacheLocal(userId);
  }

  /**
   * Salva ou atualiza uma correção vinculando obrigatoriamente ao user_id.
   * Sanitiza estritamente os campos enviados para a tabela 'correcoes' do Supabase.
   */
  static async save(correcao: Correcao, userId: string | null): Promise<Correcao> {
    // 1. Validação de campos obrigatórios
    const iemaPleno = (correcao.iema_pleno || '').trim();
    const turma = (correcao.turma || '').trim();
    const nomeEstudante = (correcao.nome_estudante || '').trim();
    const tema = (correcao.tema || '').trim();

    if (!iemaPleno || !turma || !nomeEstudante || !tema) {
      throw new DbError(
        'Campos obrigatórios não preenchidos: IEMA Pleno, Turma, Nome do Estudante e Tema devem ser informados.',
        'VALIDATION_ERROR'
      );
    }

    // 2. Validação e cálculo das notas
    const validScores = [0, 40, 80, 120, 160, 200];
    const c1Final = Number(correcao.c1_final) || 0;
    const c2Final = Number(correcao.c2_final) || 0;
    const c3Final = Number(correcao.c3_final) || 0;
    const c4Final = Number(correcao.c4_final) || 0;
    const c5Final = Number(correcao.c5_final) || 0;

    if (![c1Final, c2Final, c3Final, c4Final, c5Final].every((s) => validScores.includes(s))) {
      throw new DbError(
        'As notas das competências devem ser valores válidos (0, 40, 80, 120, 160 ou 200).',
        'VALIDATION_ERROR'
      );
    }

    const notaFinalCalculada = c1Final + c2Final + c3Final + c4Final + c5Final;

    // 3. Garante identificador UUID válido e estável para evitar duplicações
    const id = isValidUUID(correcao.id) ? correcao.id : generateUUID();
    const nowIso = new Date().toISOString();

    const record: Correcao = {
      ...correcao,
      id,
      user_id: userId || correcao.user_id || 'demo-user',
      iema_pleno: iemaPleno,
      turma,
      nome_estudante: nomeEstudante,
      tema,
      c1_final: c1Final as any,
      c2_final: c2Final as any,
      c3_final: c3Final as any,
      c4_final: c4Final as any,
      c5_final: c5Final as any,
      nota_final: notaFinalCalculada,
      created_at: correcao.created_at || nowIso,
      updated_at: nowIso,
    };

    const client = getSupabaseClient() || supabase;

    // 4. Gravação na nuvem (Supabase)
    if (userId && !userId.startsWith('demo-')) {
      if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined' && !window.navigator.onLine) {
        throw new DbError(
          'Sem conexão com a internet. Verifique sua rede e tente salvar novamente.',
          'CONNECTION_ERROR'
        );
      }

      if (!client) {
        throw new DbError(
          'Conexão com a nuvem não configurada no aplicativo.',
          'SERVER_ERROR'
        );
      }

      // Validação de sessão ativa com auto-refresh para evitar falhas por token expirado
      try {
        const { data: sessionData, error: sessionErr } = await client.auth.getSession();
        if (sessionErr || !sessionData?.session) {
          const { data: refreshData, error: refreshErr } = await client.auth.refreshSession();
          if (refreshErr || !refreshData?.session) {
            throw new DbError(
              'Sua sessão de acesso expirou. Faça login novamente para salvar na nuvem.',
              'SESSION_EXPIRED',
              'SESSION_EXPIRED',
              401
            );
          }
        }
      } catch (authErr: any) {
        if (authErr instanceof DbError) throw authErr;
        const msg = authErr?.message?.toLowerCase() || '';
        if (msg.includes('fetch') || msg.includes('network')) {
          throw new DbError(
            'Falha de conexão com o servidor de autenticação. Verifique sua internet e tente novamente.',
            'CONNECTION_ERROR'
          );
        }
        throw new DbError(
          'Sua sessão de acesso expirou. Faça login novamente para renovar o acesso.',
          'SESSION_EXPIRED',
          'AUTH_ERROR',
          401
        );
      }

      // Sanitização estrita: envia EXCLUSIVAMENTE colunas existentes na tabela 'correcoes'
      // Preserva professor_nome dentro de relatorio_pedagogico (JSONB)
      const dbPayload: Record<string, any> = {
        id: record.id,
        user_id: record.user_id,
        iema_pleno: record.iema_pleno,
        turma: record.turma,
        nome_estudante: record.nome_estudante,
        tema: record.tema,
        transcricao: record.transcricao ?? null,
        c1_sugerida: Number(record.c1_sugerida) || 0,
        c1_final: record.c1_final,
        c1_justificativa: record.c1_justificativa ?? null,
        c2_sugerida: Number(record.c2_sugerida) || 0,
        c2_final: record.c2_final,
        c2_justificativa: record.c2_justificativa ?? null,
        c3_sugerida: Number(record.c3_sugerida) || 0,
        c3_final: record.c3_final,
        c3_justificativa: record.c3_justificativa ?? null,
        c4_sugerida: Number(record.c4_sugerida) || 0,
        c4_final: record.c4_final,
        c4_justificativa: record.c4_justificativa ?? null,
        c5_sugerida: Number(record.c5_sugerida) || 0,
        c5_final: record.c5_final,
        c5_justificativa: record.c5_justificativa ?? null,
        nota_final: record.nota_final,
        nota_zero: Boolean(record.nota_zero),
        motivo_nota_zero: record.motivo_nota_zero ?? null,
        relatorio_pedagogico: {
          ...(record.relatorio_pedagogico || {}),
          ...(record.professor_nome ? { professor_nome: record.professor_nome } : {}),
        },
        observacoes: record.observacoes ?? null,
        created_at: record.created_at,
        updated_at: record.updated_at,
      };

      let data: any = null;
      let error: any = null;

      try {
        const res = await client
          .from('correcoes')
          .upsert([dbPayload], { onConflict: 'id' })
          .select()
          .single();
        data = res.data;
        error = res.error;
      } catch (networkErr: any) {
        console.error('[DB Save Network Error]', {
          name: networkErr?.name,
          message: networkErr?.message,
        });
        throw new DbError(
          'Falha de conexão com a nuvem. Verifique sua internet e tente salvar novamente.',
          'CONNECTION_ERROR'
        );
      }

      if (error) {
        // Diagnóstico técnico seguro nos logs do console (SEM redações, fotos ou dados pessoais)
        console.error('[DB Save Error]', {
          code: error.code,
          message: error.message,
          hint: error.hint,
        });

        // 1. Falha de rede/conectividade
        if (
          error.message?.toLowerCase().includes('failed to fetch') ||
          error.message?.toLowerCase().includes('network') ||
          error.code === 'PGRST000'
        ) {
          throw new DbError(
            'Falha de conexão com a nuvem. Verifique sua internet e tente salvar novamente.',
            'CONNECTION_ERROR',
            error.code
          );
        }

        // 2. Sessão expirada ou política RLS
        if (
          error.code === '42501' ||
          error.code === 'PGRST301' ||
          error.message?.toLowerCase().includes('jwt') ||
          error.message?.toLowerCase().includes('row-level security') ||
          error.message?.toLowerCase().includes('permission denied')
        ) {
          throw new DbError(
            'Sua sessão de acesso expirou ou não possui autorização. Faça login novamente para salvar na nuvem.',
            'SESSION_EXPIRED',
            error.code,
            401
          );
        }

        // 3. Restrição de dados inválidos
        if (error.code === '23514' || error.code === '23502') {
          throw new DbError(
            'Os dados enviados não atendem às regras do banco de dados (campos vazios ou notas fora do padrão).',
            'VALIDATION_ERROR',
            error.code,
            400
          );
        }

        // 4. Incompatibilidade de esquema
        if (error.code === 'PGRST204' || error.code === '42703') {
          throw new DbError(
            'Erro de compatibilidade com a tabela do banco de dados. Os dados continuam salvos na tela para você tentar novamente.',
            'SERVER_ERROR',
            error.code,
            500
          );
        }

        // 5. Erro genérico do servidor
        throw new DbError(
          `Erro no servidor do banco de dados (${error.code || 'HTTP_ERR'}): ${error.message || 'Falha ao gravar'}. Seus dados foram preservados na tela.`,
          'SERVER_ERROR',
          error.code
        );
      }

      const savedRecord: Correcao = {
        ...(data || record),
        professor_nome: record.professor_nome || (data as any)?.relatorio_pedagogico?.professor_nome || '',
      };

      this.atualizarRegistroCacheLocal(savedRecord, userId);
      return savedRecord;
    }

    // 5. Salva localmente (Modo Demonstração)
    this.atualizarRegistroCacheLocal(record, userId);
    return record;
  }

  /**
   * Exclui uma correção (garantindo RLS e exclusão local)
   */
  static async delete(id: string, userId: string | null): Promise<boolean> {
    const client = getSupabaseClient() || supabase;

    if (userId && !userId.startsWith('demo-')) {
      if (!client) throw new DbError('Conexão com a nuvem não configurada.', 'SERVER_ERROR');
      const { error } = await client.from('correcoes').delete().eq('id', id);
      if (error) {
        console.error('[DB Delete Error]', { code: error.code, message: error.message });
        throw new DbError('Não foi possível excluir na nuvem. Verifique sua conexão e tente novamente.', 'SERVER_ERROR', error.code);
      }
    }

    // Exclui do cache local
    const locais = this.lerCacheLocal(userId);
    const filtrados = locais.filter((r) => r.id !== id);
    if (typeof localStorage !== 'undefined') {
      const allRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const all: Correcao[] = allRaw ? JSON.parse(allRaw) : [];
      const updatedAll = all.filter((r) => r.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedAll));
    }
    return true;
  }

  /**
   * Verifica se o estudante já possui correção registrada na mesma turma
   */
  static async findDuplicate(
    iema: string,
    turma: string,
    nome: string,
    userId: string | null,
    excludeId?: string
  ): Promise<Correcao | null> {
    const all = await this.getAll(userId);
    const norm = (s: string) => (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const normIema = norm(iema);
    const normTurma = norm(turma);
    const normNome = norm(nome);

    return (
      all.find((r) => {
        if (excludeId && r.id === excludeId) return false;
        return (
          norm(r.iema_pleno) === normIema &&
          norm(r.turma) === normTurma &&
          norm(r.nome_estudante) === normNome
        );
      }) || null
    );
  }

  // Métodos auxiliares de cache local isolados por user_id
  private static lerCacheLocal(userId: string | null): Correcao[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return [];
      const all: Correcao[] = JSON.parse(raw);
      if (!Array.isArray(all)) return [];
      return all.filter((r) => (userId ? r.user_id === userId : r.user_id?.startsWith('demo-')));
    } catch {
      return [];
    }
  }

  private static salvarCacheLocal(registros: Correcao[], userId: string | null) {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      let all: Correcao[] = raw ? JSON.parse(raw) : [];
      all = all.filter((r) => r.user_id !== userId);
      all.push(...registros);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(all));
    } catch (err) {
      console.error('Erro ao salvar cache local:', err);
    }
  }

  private static atualizarRegistroCacheLocal(record: Correcao, userId: string | null) {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      let all: Correcao[] = raw ? JSON.parse(raw) : [];
      const index = all.findIndex((r) => r.id === record.id);
      if (index >= 0) {
        all[index] = record;
      } else {
        all.unshift(record);
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(all));
    } catch (err) {
      console.error('Erro ao atualizar registro local:', err);
    }
  }
}
