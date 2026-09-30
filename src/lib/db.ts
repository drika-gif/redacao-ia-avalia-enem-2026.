import { Correcao } from '../types';
import { supabase, getSupabaseClient } from './supabase';

const LOCAL_STORAGE_KEY = 'redacao_ia_correcoes_cache';

export class DbService {
  /**
   * Obtém todas as correções pertencentes à usuária atual.
   * Supabase RLS garante que nenhuma professora acesse dados de outra.
   */
  static async getAll(userId: string | null): Promise<Correcao[]> {
    const client = getSupabaseClient() || supabase;

    // 1. Tenta buscar do Supabase se autenticado
    if (client && userId) {
      try {
        const { data, error } = await client
          .from('correcoes')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          // Atualiza o cache local
          this.salvarCacheLocal(data, userId);
          return data as Correcao[];
        }
      } catch (err) {
        console.warn('Supabase offline ou inacessível, utilizando cache local:', err);
      }
    }

    // 2. Fallback: Lê do cache local (filtrado por userId)
    return this.lerCacheLocal(userId);
  }

  /**
   * Salva ou atualiza uma correção vinculando obrigatoriamente ao user_id
   */
  static async save(correcao: Correcao, userId: string | null): Promise<Correcao> {
    const record: Correcao = {
      ...correcao,
      user_id: userId || correcao.user_id || 'demo-user',
      c1_final: Number(correcao.c1_final) as any,
      c2_final: Number(correcao.c2_final) as any,
      c3_final: Number(correcao.c3_final) as any,
      c4_final: Number(correcao.c4_final) as any,
      c5_final: Number(correcao.c5_final) as any,
      nota_final:
        Number(correcao.c1_final) +
        Number(correcao.c2_final) +
        Number(correcao.c3_final) +
        Number(correcao.c4_final) +
        Number(correcao.c5_final),
      updated_at: new Date().toISOString(),
    };

    if (!record.id) {
      record.id = crypto.randomUUID ? crypto.randomUUID() : 'id_' + Date.now();
    }
    if (!record.created_at) {
      record.created_at = new Date().toISOString();
    }

    const client = getSupabaseClient() || supabase;

    // 1. Salva no Supabase se houver conexão e usuário logado
    if (client && userId) {
      try {
        const { data, error } = await client
          .from('correcoes')
          .upsert([record])
          .select()
          .single();

        if (!error && data) {
          this.atualizarRegistroCacheLocal(data as Correcao, userId);
          return data as Correcao;
        }
      } catch (err) {
        console.warn('Erro ao salvar no Supabase, salvando localmente:', err);
      }
    }

    // 2. Salva localmente
    this.atualizarRegistroCacheLocal(record, userId);
    return record;
  }

  /**
   * Exclui uma correção (garantindo RLS e exclusão local)
   */
  static async delete(id: string, userId: string | null): Promise<boolean> {
    const client = getSupabaseClient() || supabase;

    if (client && userId) {
      try {
        await client.from('correcoes').delete().eq('id', id);
      } catch (err) {
        console.warn('Erro ao excluir no Supabase:', err);
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
      return all.filter((r) => (userId ? r.user_id === userId : true));
    } catch {
      return [];
    }
  }

  private static salvarCacheLocal(registros: Correcao[], userId: string | null) {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      let all: Correcao[] = raw ? JSON.parse(raw) : [];
      // Remove os antigos desse userId
      all = all.filter((r) => r.user_id !== userId);
      // Adiciona os novos
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
