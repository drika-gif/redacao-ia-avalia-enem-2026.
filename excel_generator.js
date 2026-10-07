/**
 * excel_generator.js - Gerador Autônomo e Nativo da Planilha Oficial Avalia ENEM 2026
 * 
 * Cria internamente do ZERO o arquivo Excel (.XLSX) oficial, SEM depender de nenhum
 * arquivo externo ou upload do usuário.
 * 
 * Autoria do Aplicativo: Professora Adriana Aguiar (de forma independente).
 * Responsabilidade da Revisão: Professor(a) revisor(a) responsável pela turma.
 * 
 * Estrutura Oficial:
 * - Aba 'Planilha1':
 *   - Linha 1 (A1:I1 mesclado): PLANILHA DE NOTAS DA REDAÇÃO AVALIA - IEMA - 2026 (Centralizado, Negrito)
 *   - Linha 2 (A2:I2 mesclado): COORDENAÇÃO DE AVALIAÇÃO E INTELIGÊNCIA PEDAGÓGICA (Centralizado)
 *   - Linha 5: Cabeçalhos (A5: IEMA PLENO, B5: TURMA, C5: NOME DO ESTUDANTE, D5: COMPETÊNCIA I,
 *               E5: COMPETÊNCIA II, F5: COMPETÊNCIA III, G5: COMPETÊNCIA IV, H5: COMPETÊNCIA V, I5: NOTA FINAL)
 *   - Linha 6 em diante: 1 estudante por linha
 *   - Coluna I: Fórmula =SUM(D{r}:H{r}) e soma calculada
 *   - Linhas livres após tabela: Identificação de autoria da professora Adriana Aguiar e do professor revisor
 * - Aba 'Planilha2':
 *   - A1: PONTUAÇÃO, A2: 0, A3: 40, A4: 80, A5: 120, A6: 160, A7: 200
 * - Aba 'Sobre':
 *   - Detalhes de autoria independente da professora Adriana Aguiar, esclarecimento de uso institucional do IEMA
 *     e diferenciação da responsabilidade pedagógica da correção.
 * - Metadados docProps/core.xml:
 *   - Autora/Criadora configurada como Adriana Aguiar.
 */

class ExcelGenerator {
  constructor() {
    this.validScores = [0, 40, 80, 120, 160, 200];
  }

  /**
   * Sanitiza nomes para uso no nome do arquivo
   */
  sanitizeFilenamePart(str) {
    if (!str) return 'GERAL';
    return str
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Escapa caracteres especiais para XML
   */
  escapeXml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Valida se uma lista de estudantes está pronta para a planilha oficial
   */
  validarEstudantes(estudantes) {
    const erros = [];

    if (!estudantes || estudantes.length === 0) {
      erros.push({ linha: 0, mensagem: 'Não há estudantes para gerar a planilha.' });
      return { valido: false, erros };
    }

    estudantes.forEach((st, idx) => {
      const linha = idx + 6;
      const problemas = [];

      if (!st.iema_pleno || !st.iema_pleno.trim()) {
        problemas.push('IEMA Pleno não preenchido');
      }
      if (!st.turma || !st.turma.trim()) {
        problemas.push('Turma não preenchida');
      }
      if (!st.nome_estudante || !st.nome_estudante.trim()) {
        problemas.push('Nome do estudante não preenchido');
      }

      const c1 = Number(st.c1_final);
      const c2 = Number(st.c2_final);
      const c3 = Number(st.c3_final);
      const c4 = Number(st.c4_final);
      const c5 = Number(st.c5_final);

      if (!this.validScores.includes(c1)) problemas.push(`Competência I inválida (${st.c1_final}). Permitido: 0, 40, 80, 120, 160, 200.`);
      if (!this.validScores.includes(c2)) problemas.push(`Competência II inválida (${st.c2_final}). Permitido: 0, 40, 80, 120, 160, 200.`);
      if (!this.validScores.includes(c3)) problemas.push(`Competência III inválida (${st.c3_final}). Permitido: 0, 40, 80, 120, 160, 200.`);
      if (!this.validScores.includes(c4)) problemas.push(`Competência IV inválida (${st.c4_final}). Permitido: 0, 40, 80, 120, 160, 200.`);
      if (!this.validScores.includes(c5)) problemas.push(`Competência V inválida (${st.c5_final}). Permitido: 0, 40, 80, 120, 160, 200.`);

      if (problemas.length > 0) {
        erros.push({
          linha,
          estudante: st.nome_estudante || `Linha ${linha}`,
          problemas
        });
      }
    });

    return {
      valido: erros.length === 0,
      erros
    };
  }

  /**
   * Constrói o styles.xml com estilos oficiais e formatações para notas e identificação
   */
  buildStylesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="6">
    <!-- 0: Regular 11pt -->
    <font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>
    <!-- 1: Título 14pt Negrito Azul -->
    <font><b/><sz val="14"/><color rgb="FF1E3A8A"/><name val="Calibri"/><family val="2"/></font>
    <!-- 2: Subtítulo 11pt Itálico Cinza -->
    <font><i/><sz val="11"/><color rgb="FF475569"/><name val="Calibri"/><family val="2"/></font>
    <!-- 3: Cabeçalho 11pt Negrito Branco -->
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
    <!-- 4: Negrito 11pt Escuro -->
    <font><b/><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/><family val="2"/></font>
    <!-- 5: Nota Final 11pt Negrito Azul Escuro -->
    <font><b/><sz val="11"/><color rgb="FF1E3A8A"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <!-- 2: Azul Cabeçalho (Brand Blue #1D4ED8) -->
    <fill><patternFill patternType="solid"><fgColor rgb="FF1D4ED8"/></patternFill></fill>
    <!-- 3: Cinza Linha Alternada (#F8FAFC) -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>
    <!-- 4: Azul Claro Fundo Nota (#EFF6FF) -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/></patternFill></fill>
  </fills>
  <borders count="2">
    <!-- 0: Sem borda -->
    <border><left/><right/><top/><bottom/></border>
    <!-- 1: Grade suave (#CBD5E1) -->
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="11">
    <!-- 0: Padrão -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <!-- 1: Título Linha 1 -->
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 2: Subtítulo Linha 2 -->
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 3: Cabeçalho Linha 5 (Azul Royal, Texto Branco Centralizado) -->
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <!-- 4: Dados Texto Alinhado à Esquerda (IEMA e Nome) -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
    <!-- 5: Dados Turma Centralizado -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 6: Notas C1-C5 Centralizadas -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 7: Nota Final Negrito Fundo Destaque -->
    <xf numFmtId="0" fontId="5" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 8: Cabeçalho Planilha2 -->
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 9: Valores Planilha2 -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 10: Rótulo de autoria e revisão (Itálico/Discreto) -->
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>`;
  }

  /**
   * Constrói o XML da Planilha1 com títulos, cabeçalhos na linha 5 e estudantes a partir da linha 6.
   * Insere a autoria em área livre após a lista sem alterar as colunas A-I.
   */
  buildPlanilha1Xml(estudantes, professorRevisor = 'Revisado pelo(a) professor(a) responsável') {
    const studentCount = estudantes.length;
    let rowsXml = '';

    // Linha 1: Título Principal (Mesclado de A1 até I1)
    rowsXml += `<row r="1" ht="28" customHeight="1">` +
      `<c r="A1" s="1" t="inlineStr"><is><t>PLANILHA DE NOTAS DA REDAÇÃO AVALIA - IEMA - 2026</t></is></c>` +
      `<c r="B1" s="1"/><c r="C1" s="1"/><c r="D1" s="1"/><c r="E1" s="1"/><c r="F1" s="1"/><c r="G1" s="1"/><c r="H1" s="1"/><c r="I1" s="1"/>` +
      `</row>`;

    // Linha 2: Subtítulo (Mesclado de A2 até I2)
    rowsXml += `<row r="2" ht="22" customHeight="1">` +
      `<c r="A2" s="2" t="inlineStr"><is><t>COORDENAÇÃO DE AVALIAÇÃO E INTELIGÊNCIA PEDAGÓGICA</t></is></c>` +
      `<c r="B2" s="2"/><c r="C2" s="2"/><c r="D2" s="2"/><c r="E2" s="2"/><c r="F2" s="2"/><c r="G2" s="2"/><c r="H2" s="2"/><c r="I2" s="2"/>` +
      `</row>`;

    // Linhas 3 e 4 vazias para espaçamento elegante
    rowsXml += `<row r="3" ht="12" customHeight="1"/>`;
    rowsXml += `<row r="4" ht="12" customHeight="1"/>`;

    // Linha 5: Cabeçalhos oficiais (A5 até I5)
    rowsXml += `<row r="5" ht="26" customHeight="1">` +
      `<c r="A5" s="3" t="inlineStr"><is><t>IEMA PLENO</t></is></c>` +
      `<c r="B5" s="3" t="inlineStr"><is><t>TURMA</t></is></c>` +
      `<c r="C5" s="3" t="inlineStr"><is><t>NOME DO ESTUDANTE</t></is></c>` +
      `<c r="D5" s="3" t="inlineStr"><is><t>COMPETÊNCIA I</t></is></c>` +
      `<c r="E5" s="3" t="inlineStr"><is><t>COMPETÊNCIA II</t></is></c>` +
      `<c r="F5" s="3" t="inlineStr"><is><t>COMPETÊNCIA III</t></is></c>` +
      `<c r="G5" s="3" t="inlineStr"><is><t>COMPETÊNCIA IV</t></is></c>` +
      `<c r="H5" s="3" t="inlineStr"><is><t>COMPETÊNCIA V</t></is></c>` +
      `<c r="I5" s="3" t="inlineStr"><is><t>NOTA FINAL</t></is></c>` +
      `</row>`;

    // Linhas 6 em diante: Registros dos estudantes
    estudantes.forEach((st, idx) => {
      const r = 6 + idx;
      const c1 = Number(st.c1_final) || 0;
      const c2 = Number(st.c2_final) || 0;
      const c3 = Number(st.c3_final) || 0;
      const c4 = Number(st.c4_final) || 0;
      const c5 = Number(st.c5_final) || 0;
      const total = c1 + c2 + c3 + c4 + c5;

      rowsXml += `<row r="${r}" ht="20" customHeight="1">` +
        `<c r="A${r}" s="4" t="inlineStr"><is><t>${this.escapeXml(st.iema_pleno)}</t></is></c>` +
        `<c r="B${r}" s="5" t="inlineStr"><is><t>${this.escapeXml(st.turma)}</t></is></c>` +
        `<c r="C${r}" s="4" t="inlineStr"><is><t>${this.escapeXml(st.nome_estudante)}</t></is></c>` +
        `<c r="D${r}" s="6"><v>${c1}</v></c>` +
        `<c r="E${r}" s="6"><v>${c2}</v></c>` +
        `<c r="F${r}" s="6"><v>${c3}</v></c>` +
        `<c r="G${r}" s="6"><v>${c4}</v></c>` +
        `<c r="H${r}" s="6"><v>${c5}</v></c>` +
        `<c r="I${r}" s="7"><f>SUM(D${r}:H${r})</f><v>${total}</v></c>` +
        `</row>`;
    });

    // Inclusão da autoria em área livre após a tabela (preservando estrutura de 9 colunas)
    const lastRow = 5 + studentCount;
    const freeRow1 = lastRow + 2;
    const freeRow2 = lastRow + 3;
    const freeRow3 = lastRow + 4;

    rowsXml += `<row r="${freeRow1}" ht="20" customHeight="1">` +
      `<c r="A${freeRow1}" s="10" t="inlineStr"><is><t>Aplicativo criado e desenvolvido pela professora Adriana Aguiar.</t></is></c>` +
      `</row>`;
    rowsXml += `<row r="${freeRow2}" ht="20" customHeight="1">` +
      `<c r="A${freeRow2}" s="10" t="inlineStr"><is><t>Professor(a) responsável pela revisão das notas: ${this.escapeXml(professorRevisor)}</t></is></c>` +
      `</row>`;
    rowsXml += `<row r="${freeRow3}" ht="20" customHeight="1">` +
      `<c r="A${freeRow3}" s="10" t="inlineStr"><is><t>© 2026 Adriana Aguiar. Todos os direitos reservados. Informações na aba 'Sobre'.</t></is></c>` +
      `</row>`;

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:I${freeRow3}"/>
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>
    <col min="1" max="1" width="30" customWidth="1"/> <!-- IEMA PLENO -->
    <col min="2" max="2" width="14" customWidth="1"/> <!-- TURMA -->
    <col min="3" max="3" width="38" customWidth="1"/> <!-- NOME DO ESTUDANTE -->
    <col min="4" max="4" width="18" customWidth="1"/> <!-- COMP. I -->
    <col min="5" max="5" width="18" customWidth="1"/> <!-- COMP. II -->
    <col min="6" max="6" width="18" customWidth="1"/> <!-- COMP. III -->
    <col min="7" max="7" width="18" customWidth="1"/> <!-- COMP. IV -->
    <col min="8" max="8" width="18" customWidth="1"/> <!-- COMP. V -->
    <col min="9" max="9" width="18" customWidth="1"/> <!-- NOTA FINAL -->
  </cols>
  <sheetData>
    ${rowsXml}
  </sheetData>
  <mergeCells count="5">
    <mergeCell ref="A1:I1"/>
    <mergeCell ref="A2:I2"/>
    <mergeCell ref="A${freeRow1}:I${freeRow1}"/>
    <mergeCell ref="A${freeRow2}:I${freeRow2}"/>
    <mergeCell ref="A${freeRow3}:I${freeRow3}"/>
  </mergeCells>
  <pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
  }

  /**
   * Constrói o XML da Planilha2 com a escala oficial de pontuação (A1: PONTUAÇÃO, A2-A7: 0 a 200)
   */
  buildPlanilha2Xml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:A7"/>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>
    <col min="1" max="1" width="20" customWidth="1"/>
  </cols>
  <sheetData>
    <row r="1" ht="22" customHeight="1">
      <c r="A1" s="8" t="inlineStr"><is><t>PONTUAÇÃO</t></is></c>
    </row>
    <row r="2" ht="20" customHeight="1"><c r="A2" s="9"><v>0</v></c></row>
    <row r="3" ht="20" customHeight="1"><c r="A3" s="9"><v>40</v></c></row>
    <row r="4" ht="20" customHeight="1"><c r="A4" s="9"><v>80</v></c></row>
    <row r="5" ht="20" customHeight="1"><c r="A5" s="9"><v>120</v></c></row>
    <row r="6" ht="20" customHeight="1"><c r="A6" s="9"><v>160</v></c></row>
    <row r="7" ht="20" customHeight="1"><c r="A7" s="9"><v>200</v></c></row>
  </sheetData>
  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
  }

  /**
   * Constrói o XML da aba complementar 'Sobre'
   */
  buildPlanilha3Xml(professorRevisor = 'Revisado pelo(a) professor(a) responsável') {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <cols>
    <col min="1" max="1" width="32" customWidth="1"/>
    <col min="2" max="2" width="85" customWidth="1"/>
  </cols>
  <sheetData>
    <row r="1" ht="28" customHeight="1">
      <c r="A1" s="1" t="inlineStr"><is><t>REDAÇÃO IA - AVALIA ENEM 2026</t></is></c>
    </row>
    <row r="2" ht="20" customHeight="1">
      <c r="A2" s="2" t="inlineStr"><is><t>INFORMAÇÕES DE AUTORIA E USO DO APLICATIVO</t></is></c>
    </row>
    <row r="3" ht="12"/>
    <row r="4" ht="24" customHeight="1">
      <c r="A4" s="4" t="inlineStr"><is><t>Autoria do Aplicativo:</t></is></c>
      <c r="B4" s="4" t="inlineStr"><is><t>Criado e desenvolvido pela professora Adriana Aguiar.</t></is></c>
    </row>
    <row r="5" ht="24" customHeight="1">
      <c r="A5" s="4" t="inlineStr"><is><t>Direitos Autorais:</t></is></c>
      <c r="B5" s="4" t="inlineStr"><is><t>© 2026 Adriana Aguiar. Todos os direitos reservados.</t></is></c>
    </row>
    <row r="6" ht="24" customHeight="1">
      <c r="A6" s="4" t="inlineStr"><is><t>Concepção e Desenvolvimento:</t></is></c>
      <c r="B6" s="4" t="inlineStr"><is><t>Desenvolvido de forma independente para apoiar professores na análise de redações e na organização das notas.</t></is></c>
    </row>
    <row r="7" ht="24" customHeight="1">
      <c r="A7" s="4" t="inlineStr"><is><t>Uso Institucional:</t></is></c>
      <c r="B7" s="4" t="inlineStr"><is><t>A instituição IEMA é usuária da ferramenta pedagógica. O desenvolvimento é autônomo da professora Adriana Aguiar.</t></is></c>
    </row>
    <row r="8" ht="24" customHeight="1">
      <c r="A8" s="4" t="inlineStr"><is><t>Professor(a) Revisor(a):</t></is></c>
      <c r="B8" s="4" t="inlineStr"><is><t>${this.escapeXml(professorRevisor)}</t></is></c>
    </row>
    <row r="9" ht="24" customHeight="1">
      <c r="A9" s="4" t="inlineStr"><is><t>Responsabilidade das Notas:</t></is></c>
      <c r="B9" s="4" t="inlineStr"><is><t>As avaliações sugeridas pela inteligência artificial foram revisadas e validadas pelo(a) professor(a) responsável.</t></is></c>
    </row>
    <row r="10" ht="24" customHeight="1">
      <c r="A10" s="4" t="inlineStr"><is><t>Estrutura Oficial:</t></is></c>
      <c r="B10" s="4" t="inlineStr"><is><t>A Planilha1 preserva o modelo de 9 colunas e a fórmula =SUM(D:H) para cálculo da Nota Final.</t></is></c>
    </row>
  </sheetData>
  <mergeCells count="2">
    <mergeCell ref="A1:B1"/>
    <mergeCell ref="A2:B2"/>
  </mergeCells>
</worksheet>`;
  }

  /**
   * Constrói o workbook.xml com as abas: Planilha1, Planilha2, Sobre
   */
  buildWorkbookXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="27328"/>
  <workbookPr defaultThemeVersion="166925"/>
  <sheets>
    <sheet name="Planilha1" sheetId="1" r:id="rId1"/>
    <sheet name="Planilha2" sheetId="2" r:id="rId2"/>
    <sheet name="Sobre" sheetId="3" r:id="rId4"/>
  </sheets>
</workbook>`;
  }

  /**
   * Constrói xl/_rels/workbook.xml.rels
   */
  buildWorkbookRelsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
</Relationships>`;
  }

  /**
   * Constrói docProps/core.xml (Metadados OOXML com autoria de Adriana Aguiar)
   */
  buildCorePropsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Planilha de Notas da Redação Avalia ENEM 2026</dc:title>
  <dc:creator>Adriana Aguiar</dc:creator>
  <cp:lastModifiedBy>Adriana Aguiar</cp:lastModifiedBy>
  <dc:description>Aplicativo criado e desenvolvido pela professora Adriana Aguiar, de forma independente.</dc:description>
</cp:coreProperties>`;
  }

  /**
   * Constrói [Content_Types].xml
   */
  buildContentTypesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
  }

  /**
   * Constrói _rels/.rels
   */
  buildRootRelsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;
  }

  /**
   * GERA DO ZERO o arquivo Excel (.XLSX) oficial internamente.
   * Não depende de nenhum template externo nem upload do usuário!
   * 
   * @param {Array} estudantes - Lista de registros confirmados pelo professor
   * @param {Object} opcoes - { tipo: 'turma' | 'iema' | 'completa', professorRevisor?: string }
   */
  async gerarPlanilhaOficial(estudantes, opcoes = {}) {
    const validacao = this.validarEstudantes(estudantes);
    if (!validacao.valido) {
      throw new Error(`Existem informações que precisam ser revisadas antes da geração da planilha:\n${validacao.erros.map(e => `• ${e.estudante}: ${e.problemas.join(', ')}`).join('\n')}`);
    }

    // Identifica o JSZip disponível (Node.js ou Navegador)
    let ZipClass = null;
    if (typeof JSZip !== 'undefined') {
      ZipClass = JSZip;
    } else if (typeof window !== 'undefined' && window.JSZip) {
      ZipClass = window.JSZip;
    } else if (typeof global !== 'undefined' && global.JSZip) {
      ZipClass = global.JSZip;
    }

    if (!ZipClass) {
      throw new Error('Biblioteca de compactação (JSZip) não encontrada.');
    }

    const zip = new ZipClass();
    const professorRevisor = opcoes.professorRevisor || 'Revisado pelo(a) professor(a) responsável';

    // Cria toda a estrutura OpenXML do arquivo .xlsx do zero
    zip.file('[Content_Types].xml', this.buildContentTypesXml());
    zip.file('docProps/core.xml', this.buildCorePropsXml());
    zip.file('_rels/.rels', this.buildRootRelsXml());
    zip.file('xl/_rels/workbook.xml.rels', this.buildWorkbookRelsXml());
    zip.file('xl/workbook.xml', this.buildWorkbookXml());
    zip.file('xl/styles.xml', this.buildStylesXml());
    zip.file('xl/worksheets/sheet1.xml', this.buildPlanilha1Xml(estudantes, professorRevisor)); // Planilha1 oficial
    zip.file('xl/worksheets/sheet2.xml', this.buildPlanilha2Xml()); // Planilha2 oficial
    zip.file('xl/worksheets/sheet3.xml', this.buildPlanilha3Xml(professorRevisor)); // Aba Sobre

    // Determina o nome oficial do arquivo gerado conforme as regras
    let filename = 'NOTAS_REDACAO_AVALIA_ENEM_2026_COMPLETA.xlsx';
    if (opcoes.tipo === 'turma' && estudantes.length > 0) {
      const iemaSanitizado = this.sanitizeFilenamePart(estudantes[0].iema_pleno);
      const turmaSanitizada = this.sanitizeFilenamePart(estudantes[0].turma);
      filename = `NOTAS_REDACAO_AVALIA_ENEM_2026_${iemaSanitizado}_${turmaSanitizada}.xlsx`;
    } else if (opcoes.tipo === 'iema' && estudantes.length > 0) {
      const iemaSanitizado = this.sanitizeFilenamePart(estudantes[0].iema_pleno);
      filename = `NOTAS_REDACAO_AVALIA_ENEM_2026_${iemaSanitizado}.xlsx`;
    }

    // Gera o arquivo .xlsx
    let output;
    if (typeof window !== 'undefined') {
      output = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        compression: 'DEFLATE'
      });
    } else {
      output = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE'
      });
    }

    const totalEstudantes = estudantes.length;
    const mediaTurma = Math.round(estudantes.reduce((acc, st) => acc + (Number(st.nota_final) || 0), 0) / totalEstudantes);

    return {
      blob: output,
      filename,
      totalEstudantes,
      mediaTurma
    };
  }
}

// Exporta globalmente no navegador e no Node
if (typeof window !== 'undefined') {
  window.excelGenerator = new ExcelGenerator();
}
if (typeof global !== 'undefined') {
  global.excelGenerator = new ExcelGenerator();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExcelGenerator;
}

export default ExcelGenerator;

