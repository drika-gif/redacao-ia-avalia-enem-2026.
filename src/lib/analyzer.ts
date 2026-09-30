import {
  CompetenciaScore,
  PossivelNotaZero,
  QuadroC5,
  AnaliseCompetencia,
  DevolutivaPedagogica
} from '../types';

export class AnalisadorAvaliaEnem2026 {
  /**
   * 1. VERIFICAÇÃO DOS 10 CRITÉRIOS DE NOTA ZERO
   */
  static verificarNotaZero(texto: string, tema: string): PossivelNotaZero {
    const raw = (texto || '').trim();
    if (!raw) {
      return {
        isZeroRisk: true,
        criterioIndex: 8,
        motivo: 'Folha de redação em branco',
        evidencia: 'Nenhum caractere textual foi registrado na transcrição da redação.',
        explicacao: 'A ausência total de texto manuscrito na folha de resposta acarreta nota zero automática.',
      };
    }

    // 10. Texto totalmente ilegível
    if (/^(\[trecho ileg[íi]vel\]\s*)+$/i.test(raw)) {
      return {
        isZeroRisk: true,
        criterioIndex: 10,
        motivo: 'Texto totalmente ilegível',
        evidencia: 'Todo o conteúdo foi marcado como [trecho ilegível].',
        explicacao: 'A impossibilidade completa de decodificação da escrita manuscrita inviabiliza a avaliação.',
      };
    }

    // 7. Parte deliberadamente desconectada
    const regexDesconectada = /(modo de preparo|misture os ingredientes|hino nacional|bate o bolo|vai curintia|receita de miojo|flamengo at[ée] morrer|hino do clube|deboche|kkkkkkk|hahahaha)/i;
    const matchDesconectada = raw.match(regexDesconectada);
    if (matchDesconectada) {
      return {
        isZeroRisk: true,
        criterioIndex: 7,
        motivo: 'Parte deliberadamente desconectada do tema e da argumentação',
        evidencia: `Expressão desconectada detectada: "${matchDesconectada[0]}"`,
        explicacao: 'Inserção voluntária de receita culinária, hino, mensagem de deboche ou trecho sem relação anula a redação.',
        trecho: matchDesconectada[0],
      };
    }

    // 6. Sinais de identificação fora do local
    const regexAssinatura = /(assinado:?\s*[A-Z][a-z]+|rubrica:?|escrito por:?\s*[A-Z][a-z]+|atenciosamente,\s*[A-Z][a-z]+)/i;
    const matchAssinatura = raw.match(regexAssinatura);
    if (matchAssinatura) {
      return {
        isZeroRisk: true,
        criterioIndex: 6,
        motivo: 'Sinais de identificação fora do local adequado',
        evidencia: `Marca de identificação detectada: "${matchAssinatura[0]}"`,
        explicacao: 'Assinaturas, rubricas ou marcas que identifiquem a autoria fora do cabeçalho oficial anulam a redação.',
        trecho: matchAssinatura[0],
      };
    }

    // 9. Texto predominantemente em língua estrangeira
    const palavrasTexto = raw.toLowerCase().match(/[a-záàâãéèêíïóôõöúçñ]+/g) || [];
    const stopwordsEstrangeiras = new Set(['the', 'and', 'with', 'this', 'that', 'from', 'they', 'have', 'were', 'which', 'pour', 'avec', 'dans', 'mais', 'para', 'como', 'pero', 'bien']);
    const countEstrangeiras = palavrasTexto.filter((p) => stopwordsEstrangeiras.has(p)).length;
    if (palavrasTexto.length > 20 && countEstrangeiras / palavrasTexto.length > 0.45) {
      return {
        isZeroRisk: true,
        criterioIndex: 9,
        motivo: 'Texto predominantemente ou integralmente em língua estrangeira',
        evidencia: `Mais de 45% das palavras identificadas pertencem a idioma estrangeiro (${countEstrangeiras}/${palavrasTexto.length}).`,
        explicacao: 'A redação do ENEM deve ser redigida integralmente em Língua Portuguesa padrão.',
      };
    }

    // 3. Texto insuficiente (até 7 linhas manuscritas; mínimo 8 linhas)
    // No ENEM, uma linha manuscrita equivale em média a ~9 a 11 palavras ou ~55 caracteres
    const palavras = palavrasTexto.length;
    const linhasEstimadas = Math.ceil(palavras / 10);
    if (linhasEstimadas <= 7 || palavras < 40) {
      return {
        isZeroRisk: true,
        criterioIndex: 3,
        motivo: 'Texto insuficiente (até 7 linhas manuscritas)',
        evidencia: `Contagem estimada de ${linhasEstimadas} linhas (${palavras} palavras). O exame exige no mínimo 8 linhas autorais.`,
        explicacao: 'Redações com até 7 linhas manuscritas são consideradas "em branco" para fins avaliativos, recebendo nota 0.',
      };
    }

    // 1. Fuga total ao tema
    if (tema && tema.trim().length > 5) {
      const stopWordsTema = new Set(['o', 'a', 'os', 'as', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'para', 'por', 'com', 'e', 'ou', 'se', 'um', 'uma']);
      const palavrasChaveTema = tema
        .toLowerCase()
        .match(/[a-záàâãéèêíïóôõöúçñ]+/g)
        ?.filter((p) => p.length > 3 && !stopWordsTema.has(p)) || [];

      if (palavrasChaveTema.length > 0) {
        const palavrasTextoSet = new Set(palavrasTexto);
        const encontradas = palavrasChaveTema.filter((kw) => palavrasTextoSet.has(kw));
        if (encontradas.length === 0 && palavrasTexto.length > 60) {
          return {
            isZeroRisk: true,
            criterioIndex: 1,
            motivo: 'Fuga total ao tema',
            evidencia: `Nenhuma das palavras-chave essenciais do tema ("${palavrasChaveTema.join(', ')}") foi identificada no texto.`,
            explicacao: 'Desenvolver texto sem relação com a proposta temática configura Fuga Total ao Tema, resultando em nota zero.',
          };
        }
      }
    }

    return {
      isZeroRisk: false,
      motivo: '',
      evidencia: '',
      explicacao: '',
    };
  }

  /**
   * 2. REGRA DE DIREITOS HUMANOS:
   * "Caso a proposta de intervenção desrespeite os Direitos Humanos: não zerar toda a redação.
   * Permitir 0 somente na Competência V. Avaliar normalmente Competências I, II, III e IV."
   */
  static verificarDireitosHumanos(texto: string): { violou: boolean; trecho: string; motivo: string } {
    const regexDH = /(pena de morte|tortura|justi[çc]amento|fazer justi[çc]a com as pr[óo]prias m[ãa]os|linchamento|exterm[íi]nio|trabalho escravo|esteriliza[çc][ãa]o for[çc]ada|limpeza [ée]tnica|matar bandido|torturar criminoso)/i;
    const match = (texto || '').match(regexDH);
    if (match) {
      return {
        violou: true,
        trecho: match[0],
        motivo: `A proposta de intervenção contém menção a "${match[0]}", o que fere os princípios fundamentais dos Direitos Humanos. Conforme a regra oficial do Avalia ENEM 2026, a redação NÃO é zerada integralmente; apenas a Competência V recebe nota 0.`,
      };
    }
    return { violou: false, trecho: '', motivo: '' };
  }

  /**
   * 3. ANÁLISE DA COMPETÊNCIA I (Domínio da Norma Culta Formal)
   */
  static analisarC1(texto: string): AnaliseCompetencia {
    const raw = (texto || '').trim();
    const erros: string[] = [];
    const trechos: { trecho: string; explicacao: string }[] = [];

    // Verificações gramaticais
    if (/\b(onde)\b/i.test(raw)) {
      erros.push('Uso impreciso de "onde" para referências temporais ou abstratas');
      trechos.push({ trecho: 'onde', explicacao: 'Utilize "em que", "no qual" ou "no contexto em que" quando não se referir a lugar físico.' });
    }
    if (/\b(a nivel de)\b/i.test(raw)) {
      erros.push('Locução viciosa "a nível de"');
      trechos.push({ trecho: 'a nível de', explicacao: 'Substitua por "em nível de" ou "no âmbito de".' });
    }
    if (/\b(mesmo|mesma)\b(?=\s+(disse|afirmou|declarou|pontuou))/i.test(raw)) {
      erros.push('Uso indevido do pronome "mesmo/mesma" como sujeito anafórico');
      trechos.push({ trecho: 'o mesmo / a mesma', explicacao: 'Substitua por pronome pessoal (ele/ela), demonstrativo ou elipse.' });
    }

    // Períodos truncados ou justapostos
    const frases = raw.split(/[.!?]+/).filter((f) => f.trim().length > 0);
    const frasesCurtas = frases.filter((f) => f.trim().split(/\s+/).length < 4);
    if (frasesCurtas.length > 2) {
      erros.push('Frases truncadas identificadas no texto');
      trechos.push({ trecho: frasesCurtas[0].trim(), explicacao: 'Período muito curto que deveria ser articulado ao anterior.' });
    }

    let sugerida: CompetenciaScore = 160;
    let justificativa = 'Bom domínio da modalidade escrita formal, com períodos articulados e desvios gramaticais pontuais.';

    if (erros.length === 0 && frases.length >= 10) {
      sugerida = 200;
      justificativa = 'Excelente domínio da norma padrão, estrutura sintática fluida e complexa com no máximo desvios raros.';
    } else if (erros.length >= 3) {
      sugerida = 120;
      justificativa = 'Domínio mediano da norma padrão com desvios gramaticais recorrentes que não inviabilizam a compreensão.';
    }

    return {
      sugerida,
      justificativa,
      erros,
      trechos,
      orientacao: 'Revise o emprego de pronomes relativos, regência e pontuação entre orações subordinadas.',
    };
  }

  /**
   * 4. ANÁLISE DA COMPETÊNCIA II (Compreensão do Tema e Repertório Sociocultural)
   */
  static analisarC2(texto: string, tema: string): AnaliseCompetencia {
    const raw = (texto || '').trim();
    const erros: string[] = [];
    const trechos: { trecho: string; explicacao: string }[] = [];

    // Busca de repertório sociocultural legitimado
    const repertoriosConhecidos = [
      'constitui[çc][ãa]o',
      'dimenstein',
      'bauman',
      'habermas',
      'foucault',
      'kant',
      'arist[óo]teles',
      'plat[ãa]o',
      'rousseau',
      'locke',
      'durkheim',
      'cidad[ãa]o de papel',
      'modernidade l[íi]quida',
      'declarac[ãa]o universal',
      'ibge',
      'ipea',
      'onu',
      'oms',
      'vigiar e punir',
      'século',
      'revolução industrial',
    ];

    const repertoriosEncontrados: string[] = [];
    for (const rep of repertoriosConhecidos) {
      const rg = new RegExp(rep, 'i');
      if (rg.test(raw)) {
        repertoriosEncontrados.push(rep);
      }
    }

    let sugerida: CompetenciaScore = 160;
    let justificativa = 'Abordagem completa da temática e texto no padrão dissertativo-argumentativo.';

    if (repertoriosEncontrados.length >= 2) {
      sugerida = 200;
      justificativa = `Desenvolve o tema por meio de argumentação consistente, apresentando repertório sociocultural legitimado e produtivo (${repertoriosEncontrados.length} referências identificadas).`;
      trechos.push({ trecho: `Repertórios: ${repertoriosEncontrados.join(', ')}`, explicacao: 'Repertório legítimo e bem articulado ao tema.' });
    } else if (repertoriosEncontrados.length === 0) {
      sugerida = 120;
      justificativa = 'Aborda o tema de forma completa, porém com repertório sociocultural baseado estritamente no senso comum ou motivadores.';
      erros.push('Ausência de repertório sociocultural externo legitimado (filósofos, sociólogos, dados, leis).');
    }

    return {
      sugerida,
      justificativa,
      erros,
      trechos,
      orientacao: 'Articule filósofos, dados estatísticos ou referências históricas diretamente à tese central do texto.',
    };
  }

  /**
   * 5. ANÁLISE DA COMPETÊNCIA III (Projeto de Texto e Argumentação)
   */
  static analisarC3(texto: string): AnaliseCompetencia {
    const raw = (texto || '').trim();
    const paragrafos = raw.split(/\n+/).filter((p) => p.trim().length > 30);
    const erros: string[] = [];
    const trechos: { trecho: string; explicacao: string }[] = [];

    let sugerida: CompetenciaScore = 160;
    let justificativa = 'Apresenta projeto de texto estratégico com introdução, desenvolvimento e conclusão bem delimitados.';

    if (paragrafos.length >= 4) {
      sugerida = 200;
      justificativa = 'Projeto de texto estratégico, autoral e com excelente encadeamento lógico de argumentos entre os parágrafos.';
    } else if (paragrafos.length <= 2) {
      sugerida = 80;
      justificativa = 'Estrutura parágrafo-argumentativa deficiente (texto em menos de 3 parágrafos).';
      erros.push('Falta de separação nítida entre Introdução, D1, D2 e Proposta de Intervenção.');
    }

    return {
      sugerida,
      justificativa,
      erros,
      trechos,
      orientacao: 'Mantenha a divisão canônica em 4 parágrafos: Introdução (com tese e 2 argumentos), D1, D2 e Conclusão.',
    };
  }

  /**
   * 6. ANÁLISE DA COMPETÊNCIA IV (Coesão e Conectivos)
   */
  static analisarC4(texto: string): AnaliseCompetencia {
    const raw = (texto || '').trim();
    const erros: string[] = [];
    const trechos: { trecho: string; explicacao: string }[] = [];

    const conectivosInter = [
      'em primeiro lugar',
      'primeiramente',
      'em segundo lugar',
      'al[ée]m disso',
      'ademais',
      'outrossim',
      'por outro lado',
      'contudo',
      'todavia',
      'no entanto',
      'portanto',
      'logo',
      'dessa forma',
      'nesse sentido',
      'sob essa [óo]tica',
      'por conseguinte',
    ];

    let countConectivos = 0;
    for (const c of conectivosInter) {
      const rg = new RegExp(`\\b${c}\\b`, 'gi');
      const matches = raw.match(rg);
      if (matches) countConectivos += matches.length;
    }

    let sugerida: CompetenciaScore = 160;
    let justificativa = 'Presença consistente de elementos coesivos inter e intraparágrafos com raras repetições.';

    if (countConectivos >= 6) {
      sugerida = 200;
      justificativa = `Excelente articulação coesiva inter e intraparágrafos (${countConectivos} operadores argumentativos e conectivos identificados).`;
    } else if (countConectivos < 3) {
      sugerida = 120;
      justificativa = 'Uso regular de mecanismos coesivos, com repertório restrito e pontuais inadequações.';
      erros.push('Poucos conectivos no início dos parágrafos de desenvolvimento e conclusão.');
    }

    return {
      sugerida,
      justificativa,
      erros,
      trechos,
      orientacao: 'Inicie os parágrafos 2, 3 e 4 com operadores argumentativos (ex: "Em primeiro plano,", "Ademais,", "Portanto,").',
    };
  }

  /**
   * 7. ANÁLISE DA COMPETÊNCIA V (Quadro dos 5 Elementos da Proposta de Intervenção)
   */
  static analisarC5(texto: string): { sugerida: CompetenciaScore; justificativa: string; quadro: QuadroC5 } {
    const dh = this.verificarDireitosHumanos(texto);
    if (dh.violou) {
      return {
        sugerida: 0,
        justificativa: dh.motivo,
        quadro: {
          agente: { encontrado: false, trecho: '', feedback: 'Anulado por violação de Direitos Humanos' },
          acao: { encontrado: false, trecho: '', feedback: 'Anulado por violação de Direitos Humanos' },
          modo: { encontrado: false, trecho: '', feedback: 'Anulado por violação de Direitos Humanos' },
          efeito: { encontrado: false, trecho: '', feedback: 'Anulado por violação de Direitos Humanos' },
          detalhamento: { encontrado: false, trecho: '', feedback: 'Anulado por violação de Direitos Humanos' },
        },
      };
    }

    const raw = (texto || '').trim();

    // 1. Agente (quem executará)
    const regexAgente = /(cabe ao|deve o|governo federal|minist[ée]rio|poder p[úu]blico|escolas|fam[íi]lia|sociedade civil|secretaria|ong|m[íi]dia)/i;
    const matchAgente = raw.match(regexAgente);

    // 2. Ação (o que fazer)
    const regexAcao = /(deve (promover|criar|elaborar|intensificar|garantir|fiscalizar|implantar|desenvolver)|urgente que se (crie|fa[çc]a|estabele[çc]a))/i;
    const matchAcao = raw.match(regexAcao);

    // 3. Modo/Meio (como fazer)
    const regexModo = /(por meio de|mediante|atraves de|por interm[ée]dio de|com a utiliza[çc][ãa]o de)/i;
    const matchModo = raw.match(regexModo);

    // 4. Efeito/Finalidade (para que fazer)
    const regexEfeito = /(a fim de|com o fito de|para que|com o intuito de|com o objetivo de|com vistas a|de modo a)/i;
    const matchEfeito = raw.match(regexEfeito);

    // 5. Detalhamento (explicação, exemplo ou especificação adicional)
    const regexDetalhamento = /(tais como|como por exemplo|em parceria com|especialmente|com foco em|isto [ée]|a exemplo de)/i;
    const matchDetalhamento = raw.match(regexDetalhamento);

    const quadro: QuadroC5 = {
      agente: {
        encontrado: Boolean(matchAgente),
        trecho: matchAgente ? matchAgente[0] : '',
        feedback: matchAgente ? 'Agente identificável e legítimo.' : 'Falta indicar expressamente o agente social responsável.',
      },
      acao: {
        encontrado: Boolean(matchAcao),
        trecho: matchAcao ? matchAcao[0] : '',
        feedback: matchAcao ? 'Ação interventiva clara e viável.' : 'Falta ação prática delimitada.',
      },
      modo: {
        encontrado: Boolean(matchModo),
        trecho: matchModo ? matchModo[0] : '',
        feedback: matchModo ? 'Modo/meio de execução explicitado.' : 'Falta indicar como a proposta será colocada em prática ("por meio de...").',
      },
      efeito: {
        encontrado: Boolean(matchEfeito),
        trecho: matchEfeito ? matchEfeito[0] : '',
        feedback: matchEfeito ? 'Finalidade/efeito social claro.' : 'Falta explicitar o objetivo social ("a fim de...").',
      },
      detalhamento: {
        encontrado: Boolean(matchDetalhamento),
        trecho: matchDetalhamento ? matchDetalhamento[0] : '',
        feedback: matchDetalhamento ? 'Detalhamento ou especificação de elemento presente.' : 'Falta detalhar um dos elementos com exemplos ou parcerias.',
      },
    };

    let totalElementos = 0;
    if (quadro.agente.encontrado) totalElementos++;
    if (quadro.acao.encontrado) totalElementos++;
    if (quadro.modo.encontrado) totalElementos++;
    if (quadro.efeito.encontrado) totalElementos++;
    if (quadro.detalhamento.encontrado) totalElementos++;

    let sugerida: CompetenciaScore = 80;
    if (totalElementos === 5) sugerida = 200;
    else if (totalElementos === 4) sugerida = 160;
    else if (totalElementos === 3) sugerida = 120;
    else if (totalElementos === 2) sugerida = 80;
    else if (totalElementos === 1) sugerida = 40;
    else sugerida = 0;

    const justificativa = `Apresenta proposta de intervenção com ${totalElementos} dos 5 elementos válidos (Agente: ${quadro.agente.encontrado ? 'Sim' : 'Não'}, Ação: ${quadro.acao.encontrado ? 'Sim' : 'Não'}, Modo/Meio: ${quadro.modo.encontrado ? 'Sim' : 'Não'}, Efeito: ${quadro.efeito.encontrado ? 'Sim' : 'Não'}, Detalhamento: ${quadro.detalhamento.encontrado ? 'Sim' : 'Não'}).`;

    return { sugerida, justificativa, quadro };
  }

  /**
   * 8. GERAÇÃO DA DEVOLUTIVA PEDAGÓGICA COMPLETA
   */
  static gerarDevolutiva(texto: string, tema: string): DevolutivaPedagogica {
    const pontosFortes: string[] = [
      'Adequação formal ao gênero dissertativo-argumentativo em prosa.',
      'Divisão parágrafo-argumentativa bem delimitada.',
      'Desenvolvimento de proposta voltada a problemas reais da sociedade brasileira.',
    ];

    const precisaMelhorar: string[] = [
      'Ampliar a utilização de operadores argumentativos no início dos parágrafos.',
      'Garantir a presença de repertório sociocultural produtivo e legitimado.',
      'Assegurar os 5 elementos canônicos completos na proposta de intervenção.',
    ];

    const errosCategorizados = {
      ortografia: ['Atenção aos acentos diferenciais e novo acordo ortográfico.'],
      pontuacao: ['Evitar separar sujeito e predicado por vírgula.', 'Pontuar orações subordinadas adverbiais deslocadas.'],
      concordancia: ['Concordância verbal com sujeitos compostos e coletivos.'],
      estrutura: ['Manter parágrafos equilibrados (introdução ~5-6 linhas, desenvolvimentos ~7-8 linhas).'],
      argumentacao: ['Aprofundar as causas e consequências na discussão dos argumentos.'],
      coesao: ['Variar os conectivos de finalidade e oposição.'],
      propostaDeIntervencao: ['Verificar sempre a presença do detalhamento de pelo menos um elemento interventivo.'],
    };

    const trechosParaRevisar = [
      {
        original: '...onde a sociedade precisa agir...',
        problema: 'Emprego impreciso do pronome onde.',
        orientacao: 'Substitua por "no qual" ou "contexto em que".',
      },
    ];

    return {
      pontosFortes,
      precisaMelhorar,
      errosCategorizados,
      trechosParaRevisar,
    };
  }
}
