import JSZip from 'jszip';
import { Correcao } from '../types';

export class ExcelOficialGenerator {
  static escapeXml(str: string | number | null | undefined): string {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  static sanitizeFilename(str: string): string {
    return (str || '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Gera o arquivo XLSX oficial com Planilha1 e Planilha2 de forma autônoma
   */
  static async gerarPlanilhaOficial(
    correcoes: Correcao[],
    iemaPlenoDefault: string = 'IEMA PLENO',
    turmaDefault: string = 'TURMA'
  ): Promise<{ blob: Blob; filename: string }> {
    const zip = new JSZip();

    // 1. [Content_Types].xml
    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
    zip.file('[Content_Types].xml', contentTypesXml);

    // 2. _rels/.rels
    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
    zip.file('_rels/.rels', relsXml);

    // 3. xl/_rels/workbook.xml.rels
    const wbRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
    zip.file('xl/_rels/workbook.xml.rels', wbRelsXml);

    // 4. xl/workbook.xml
    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Planilha1" sheetId="1" r:id="rId1"/>
    <sheet name="Planilha2" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`;
    zip.file('xl/workbook.xml', workbookXml);

    // 5. xl/styles.xml
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><color rgb="FF1E3A8A"/><name val="Calibri"/></font>
    <font><i/><sz val="11"/><color rgb="FF475569"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1D4ED8"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/></border>
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
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>`;
    zip.file('xl/styles.xml', stylesXml);

    // 6. xl/worksheets/sheet1.xml (Planilha1)
    let sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="28" customWidth="1"/>
    <col min="2" max="2" width="16" customWidth="1"/>
    <col min="3" max="3" width="38" customWidth="1"/>
    <col min="4" max="4" width="18" customWidth="1"/>
    <col min="5" max="5" width="18" customWidth="1"/>
    <col min="6" max="6" width="18" customWidth="1"/>
    <col min="7" max="7" width="18" customWidth="1"/>
    <col min="8" max="8" width="18" customWidth="1"/>
    <col min="9" max="9" width="18" customWidth="1"/>
  </cols>
  <sheetData>
    <row r="1" ht="28" customHeight="1">
      <c r="A1" s="1" t="inlineStr"><is><t>PLANILHA DE NOTAS DA REDAÇÃO AVALIA - IEMA - 2026</t></is></c>
    </row>
    <row r="2" ht="20" customHeight="1">
      <c r="A2" s="2" t="inlineStr"><is><t>COORDENAÇÃO DE AVALIAÇÃO E INTELIGÊNCIA PEDAGÓGICA</t></is></c>
    </row>
    <row r="3" ht="12"/>
    <row r="4" ht="12"/>
    <row r="5" ht="26" customHeight="1">
      <c r="A5" s="3" t="inlineStr"><is><t>IEMA PLENO</t></is></c>
      <c r="B5" s="3" t="inlineStr"><is><t>TURMA</t></is></c>
      <c r="C5" s="3" t="inlineStr"><is><t>NOME DO ESTUDANTE</t></is></c>
      <c r="D5" s="3" t="inlineStr"><is><t>COMPETÊNCIA I</t></is></c>
      <c r="E5" s="3" t="inlineStr"><is><t>COMPETÊNCIA II</t></is></c>
      <c r="F5" s="3" t="inlineStr"><is><t>COMPETÊNCIA III</t></is></c>
      <c r="G5" s="3" t="inlineStr"><is><t>COMPETÊNCIA IV</t></is></c>
      <c r="H5" s="3" t="inlineStr"><is><t>COMPETÊNCIA V</t></is></c>
      <c r="I5" s="3" t="inlineStr"><is><t>NOTA FINAL</t></is></c>
    </row>`;

    // Inserção dos estudantes a partir da linha 6
    let rowIndex = 6;
    for (const est of correcoes) {
      const iema = this.escapeXml(est.iema_pleno || iemaPlenoDefault);
      const turma = this.escapeXml(est.turma || turmaDefault);
      const nome = this.escapeXml(est.nome_estudante);
      const c1 = Number(est.c1_final) || 0;
      const c2 = Number(est.c2_final) || 0;
      const c3 = Number(est.c3_final) || 0;
      const c4 = Number(est.c4_final) || 0;
      const c5 = Number(est.c5_final) || 0;
      const notaFinal = c1 + c2 + c3 + c4 + c5;
      const formula = `SUM(D${rowIndex}:H${rowIndex})`;

      sheet1Xml += `
    <row r="${rowIndex}" ht="20" customHeight="1">
      <c r="A${rowIndex}" s="4" t="inlineStr"><is><t>${iema}</t></is></c>
      <c r="B${rowIndex}" s="5" t="inlineStr"><is><t>${turma}</t></is></c>
      <c r="C${rowIndex}" s="4" t="inlineStr"><is><t>${nome}</t></is></c>
      <c r="D${rowIndex}" s="5"><v>${c1}</v></c>
      <c r="E${rowIndex}" s="5"><v>${c2}</v></c>
      <c r="F${rowIndex}" s="5"><v>${c3}</v></c>
      <c r="G${rowIndex}" s="5"><v>${c4}</v></c>
      <c r="H${rowIndex}" s="5"><v>${c5}</v></c>
      <c r="I${rowIndex}" s="5"><f>${formula}</f><v>${notaFinal}</v></c>
    </row>`;
      rowIndex++;
    }

    sheet1Xml += `
  </sheetData>
  <mergeCells count="2">
    <mergeCell ref="A1:I1"/>
    <mergeCell ref="A2:I2"/>
  </mergeCells>
</worksheet>`;
    zip.file('xl/worksheets/sheet1.xml', sheet1Xml);

    // 7. xl/worksheets/sheet2.xml (Planilha2 com escala oficial de pontuação)
    const sheet2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="18" customWidth="1"/>
  </cols>
  <sheetData>
    <row r="1" ht="22" customHeight="1">
      <c r="A1" s="3" t="inlineStr"><is><t>PONTUAÇÃO</t></is></c>
    </row>
    <row r="2"><c r="A2" s="5"><v>0</v></c></row>
    <row r="3"><c r="A3" s="5"><v>40</v></c></row>
    <row r="4"><c r="A4" s="5"><v>80</v></c></row>
    <row r="5"><c r="A5" s="5"><v>120</v></c></row>
    <row r="6"><c r="A6" s="5"><v>160</v></c></row>
    <row r="7"><c r="A7" s="5"><v>200</v></c></row>
  </sheetData>
</worksheet>`;
    zip.file('xl/worksheets/sheet2.xml', sheet2Xml);

    // 8. Gera o blob binário do arquivo .xlsx
    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const iemaPart = this.sanitizeFilename(correcoes[0]?.iema_pleno || iemaPlenoDefault);
    const turmaPart = this.sanitizeFilename(correcoes[0]?.turma || turmaDefault);
    const filename = `NOTAS_REDACAO_AVALIA_ENEM_2026_${iemaPart}_${turmaPart}.xlsx`;

    return { blob, filename };
  }

  static downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
