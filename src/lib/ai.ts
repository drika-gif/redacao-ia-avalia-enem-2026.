import { getSupabaseClient } from './supabase';
import { AnaliseCompetencia, DevolutivaPedagogica, PossivelNotaZero, QuadroC5, CompetenciaScore, ImagemFolha } from '../types';
import { optimizeImageForAi } from './image-compress';

export interface AiAnalysis {
  transcricao?: string;
  precisaNovaFoto?: boolean;
  motivoNovaFoto?: string;
  limitacoesLeitura?: string;
  c1: AnaliseCompetencia;
  c2: AnaliseCompetencia;
  c3: AnaliseCompetencia;
  c4: AnaliseCompetencia;
  c5: { sugerida: CompetenciaScore; justificativa: string; quadro: QuadroC5 };
  notaZero: PossivelNotaZero;
  devolutiva: DevolutivaPedagogica;
}

export interface AnalisarParams {
  tema: string;
  transcricao?: string;
  imagens?: ImagemFolha[];
}

export async function analisarComIA(
  temaOuParam: string | AnalisarParams,
  transcricaoParam?: string
): Promise<AiAnalysis> {
  const client = getSupabaseClient();
  if (!client) throw new Error('A conexão com o Supabase não está configurada.');
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) throw new Error('Entre na sua conta para usar a IA. O modo demonstração não usa IA.');

  let tema = '';
  let transcricao = '';
  const imagensPayload: { dataUrl: string; mimeType: string }[] = [];

  if (typeof temaOuParam === 'string') {
    tema = temaOuParam;
    transcricao = transcricaoParam || '';
  } else {
    tema = temaOuParam.tema;
    transcricao = temaOuParam.transcricao || '';
    if (temaOuParam.imagens && temaOuParam.imagens.length > 0) {
      for (const img of temaOuParam.imagens) {
        if (img.dataUrl) {
          const opt = await optimizeImageForAi(img.dataUrl);
          imagensPayload.push({
            dataUrl: opt.dataUrl,
            mimeType: opt.mimeType,
          });
        }
      }
    }
  }

  const response = await fetch('/api/ai', {
    method: 'POST',
    signal: AbortSignal.timeout(65000),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`
    },
    body: JSON.stringify({
      tema,
      transcricao,
      ...(imagensPayload.length > 0 ? { imagens: imagensPayload } : {})
    })
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('A atualização da IA ainda não está disponível neste endereço.');
  }

  if (!response.ok) throw new Error(payload.error || 'Não foi possível analisar a redação.');
  if (!payload.analysis) throw new Error('A IA retornou uma resposta incompleta.');
  return payload.analysis;
}
