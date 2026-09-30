export type CompetenciaScore = 0 | 40 | 80 | 120 | 160 | 200;

export interface ElementoIntervencao {
  encontrado: boolean;
  trecho: string;
  feedback: string;
}

export interface QuadroC5 {
  agente: ElementoIntervencao;
  acao: ElementoIntervencao;
  modo: ElementoIntervencao;
  efeito: ElementoIntervencao;
  detalhamento: ElementoIntervencao;
}

export interface PossivelNotaZero {
  isZeroRisk: boolean;
  motivo: string;
  evidencia: string;
  explicacao: string;
  trecho?: string;
  criterioIndex?: number;
}

export interface AnaliseCompetencia {
  sugerida: CompetenciaScore;
  justificativa: string;
  erros: string[];
  trechos: { trecho: string; explicacao: string }[];
  orientacao: string;
}

export interface DevolutivaPedagogica {
  pontosFortes: string[];
  precisaMelhorar: string[];
  errosCategorizados: {
    ortografia: string[];
    pontuacao: string[];
    concordancia: string[];
    estrutura: string[];
    argumentacao: string[];
    coesao: string[];
    propostaDeIntervencao: string[];
  };
  trechosParaRevisar: {
    original: string;
    problema: string;
    orientacao: string;
  }[];
}

export interface Correcao {
  id: string;
  user_id?: string;
  iema_pleno: string;
  turma: string;
  nome_estudante: string;
  tema: string;
  transcricao: string;
  
  c1_sugerida: CompetenciaScore;
  c1_final: CompetenciaScore;
  c1_justificativa: string;
  
  c2_sugerida: CompetenciaScore;
  c2_final: CompetenciaScore;
  c2_justificativa: string;
  
  c3_sugerida: CompetenciaScore;
  c3_final: CompetenciaScore;
  c3_justificativa: string;
  
  c4_sugerida: CompetenciaScore;
  c4_final: CompetenciaScore;
  c4_justificativa: string;
  
  c5_sugerida: CompetenciaScore;
  c5_final: CompetenciaScore;
  c5_justificativa: string;
  
  nota_final: number;
  nota_zero: boolean;
  motivo_nota_zero?: string;
  
  relatorio_pedagogico?: DevolutivaPedagogica;
  observacoes?: string;
  
  created_at: string;
  updated_at: string;
}

export interface ImagemFolha {
  id: string;
  dataUrl: string;
  rotation: number;
  name: string;
}

export interface ProfessorUser {
  id: string;
  email: string;
  nome?: string;
}

export const PONTUACOES_VALIDAS: CompetenciaScore[] = [0, 40, 80, 120, 160, 200];
