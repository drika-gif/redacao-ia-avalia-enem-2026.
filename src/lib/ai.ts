import { getSupabaseClient } from './supabase';
import { AnaliseCompetencia, DevolutivaPedagogica, PossivelNotaZero, QuadroC5, CompetenciaScore } from '../types';

export interface AiAnalysis {
  c1: AnaliseCompetencia; c2: AnaliseCompetencia; c3: AnaliseCompetencia; c4: AnaliseCompetencia;
  c5: { sugerida: CompetenciaScore; justificativa: string; quadro: QuadroC5 };
  notaZero: PossivelNotaZero; devolutiva: DevolutivaPedagogica;
}

export async function analisarComIA(tema: string, transcricao: string): Promise<AiAnalysis> {
  const client = getSupabaseClient();
  if (!client) throw new Error('A conexão com o Supabase não está configurada.');
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) throw new Error('Entre na sua conta para usar a IA. O modo demonstração não usa IA.');
  const response = await fetch('/api/ai', {
    method: 'POST', signal: AbortSignal.timeout(65000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify({ tema, transcricao })
  });
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('A atualização da IA ainda não está disponível neste endereço.'); }
  if (!response.ok) throw new Error(payload.error || 'Não foi possível analisar a redação.');
  if (!payload.analysis) throw new Error('A IA retornou uma resposta incompleta.');
  return payload.analysis;
}
