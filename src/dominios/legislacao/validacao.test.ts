import type { Bloco, Trecho } from '../../core/seguranca/sanitizador';
import { estruturar } from './estruturador';
import { emOrdemDeLeitura } from './ordem';
import type { NoRascunho, Rascunho, TipoAnomalia } from './rascunho';
import {
  anomalia,
  GRAVIDADE,
  LIMITE_A_CONFIRMAR,
  marcarConflitos,
  nosDoRascunho,
  TIPOS_DE_ANOMALIA,
  validarEstrutura,
  validarNos,
  type NoValidado,
} from './validacao';

// Casos tirados do corpus (colados de corpus/normas/, 30/09/2026), reduzidos ao que a regra pede.
const b = (...trechos: (string | Trecho)[]): Bloco => ({
  trechos: trechos.map((t) => (typeof t === 'string' ? { texto: t } : t)),
});
const tachado = (texto: string): Trecho => ({ texto, tachado: true });
const blocos = (...linhas: (string | Bloco)[]) =>
  linhas.map((l) => (typeof l === 'string' ? b(l) : l));

/** Tipo e endereço das anomalias de um tipo (ou de todos). */
const achadas = (r: Pick<Rascunho, 'anomalias'>, ...tipos: TipoAnomalia[]) =>
  r.anomalias
    .filter((a) => tipos.length === 0 || tipos.includes(a.tipo))
    .map((a) => [a.tipo, a.endereco]);
const mensagens = (r: Pick<Rascunho, 'anomalias'>, tipo: TipoAnomalia) =>
  r.anomalias.filter((a) => a.tipo === tipo).map((a) => a.mensagem);

/** Nó à mão, para `validarNos` (o que os registros gravados dão). */
const no = (
  tipo: NoValidado['tipo'],
  endereco: string,
  extra: Partial<NoValidado> = {},
): NoValidado => ({
  tipo,
  endereco,
  status: 'vigente',
  confianca: 'alta',
  estrutural: false,
  ...extra,
});

describe('gravidade (regras 12 e 13, 8.7)', () => {
  it('lista fechada: só "sem_artigos" e "endereco_duplicado" bloqueiam', () => {
    expect(TIPOS_DE_ANOMALIA.filter((t) => GRAVIDADE[t] === 'conflito')).toEqual([
      'sem_artigos',
      'endereco_duplicado',
    ]);
    expect(TIPOS_DE_ANOMALIA).toHaveLength(18);
  });

  it('a gravidade sai do mapa; o que não se sabe fica fora do objeto', () => {
    expect(anomalia('linha_solta', 'Linha solta.', { linha: 3 })).toEqual({
      tipo: 'linha_solta',
      gravidade: 'aviso',
      linha: 3,
      mensagem: 'Linha solta.',
    });
    const conflito = anomalia('endereco_duplicado', 'Repetido.', { endereco: 'art1' });
    expect(conflito).toStrictEqual({
      tipo: 'endereco_duplicado',
      gravidade: 'conflito',
      endereco: 'art1',
      mensagem: 'Repetido.',
    });
  });
});

describe('nós do rascunho para a validação', () => {
  it('ordem de leitura, pai pelo índice, categoria da gravação, rótulo no limite do modelo', () => {
    const r = estruturar(
      blocos('TÍTULO I', 'DAS DISPOSIÇÕES GERAIS', 'Objeto', `Art. 1º ${'Texto. '.repeat(3)}`),
    );
    r.nos[0]?.filhos.forEach((f) => {
      if (f.tipo === 'artigo') f.rotulo = 'A'.repeat(600);
    });
    const nos = nosDoRascunho(r.nos);
    expect(nos.map((n) => [n.endereco, n.pai, n.estrutural, n.linha])).toEqual([
      ['tit1', undefined, true, 0],
      ['tit1.nome', 0, true, 1],
      ['art1', 0, false, 2],
      ['art1.nome', 2, false, 2],
    ]);
    expect(nos[2]?.rotulo).toHaveLength(500);
  });
});

describe('validação estrutural (regra 13, 8.7)', () => {
  it('lei inteira em ordem: nada a acusar', () => {
    const r = estruturar(
      blocos(
        'TÍTULO I',
        'DAS DISPOSIÇÕES GERAIS',
        'Art. 1º Esta Lei trata do teste.',
        'Art. 1º-A. Incluído depois.',
        'Art. 1º-A-A. Incluído entre o 1º-A e o 1º-B.',
        'Art. 1º-B. Incluído depois.',
        'Art. 2º São deveres:',
        'I - estudar;',
        'a) de manhã;',
        '1. cedo;',
        '§ 1º Um.',
        '§ 2º Dois.',
        'Brasília, 5 de outubro de 1988.',
        'ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS',
        'Art. 1º. O Presidente prestará o compromisso.',
        'Art. 2º. No dia 7 de setembro de 1993.',
      ),
    );
    expect(r.anomalias).toEqual([]);
  });

  it('sem artigo: um conflito só, "Não consegui identificar artigos."', () => {
    const r = estruturar(blocos('Um texto qualquer.', 'Outro parágrafo.'));
    expect(r.anomalias).toEqual([
      { tipo: 'sem_artigos', gravidade: 'conflito', mensagem: 'Não consegui identificar artigos.' },
    ]);
  });

  it('LC 80, duas "SEÇÃO IV" no Capítulo I do Título III: estrutural repetido só avisa', () => {
    const r = estruturar(
      blocos(
        'TÍTULO III',
        'DA DEFENSORIA PÚBLICA DO DISTRITO FEDERAL E DOS TERRITÓRIOS',
        'CAPÍTULO I',
        'DA ESTRUTURA',
        'Art. 61. A Defensoria Pública do Distrito Federal é organizada.',
        'SEÇÃO IV',
        'Dos Núcleos da Defensoria Pública do Distrito Federal e dos Territórios',
        'Art. 62. A Defensoria Pública do Distrito Federal exercerá suas funções.',
        'SEÇÃO IV',
        'Dos Defensores Públicos do Distrito Federal e dos Territórios',
        'Art. 64. Aos Defensores Públicos do Distrito Federal incumbe o desempenho.',
      ),
    );
    expect(r.anomalias.filter((a) => a.tipo === 'estrutural_repetido')).toEqual([
      {
        tipo: 'estrutural_repetido',
        gravidade: 'aviso',
        endereco: 'tit3.cap1.sec4',
        linha: 5,
        mensagem:
          'O endereço tit3.cap1.sec4 aparece 2 vezes (SEÇÃO IV): a fonte repete a numeração. Dá para publicar; corrija o rótulo na revisão.',
      },
      {
        tipo: 'estrutural_repetido',
        gravidade: 'aviso',
        endereco: 'tit3.cap1.sec4.nome',
        linha: 6,
        mensagem:
          'O endereço tit3.cap1.sec4.nome aparece 2 vezes (tit3.cap1.sec4.nome): a fonte repete a numeração. Dá para publicar; corrija o rótulo na revisão.',
      },
    ]);
    // Aviso não mexe na confiança.
    expect(emOrdemDeLeitura(r.nos).every(({ no: n }) => n.confianca === 'alta')).toBe(true);
  });

  it('endereço repetido com dispositivo: conflito, um por endereço, e o nó fica "a confirmar" (regra 12)', () => {
    const nos = [
      no('titulo', 'tit1', { estrutural: true, rotulo: 'TÍTULO I' }),
      no('artigo', 'art1', { rotulo: 'Art. 1º', pai: 0 }),
      no('nome', 'art1.nome', { pai: 1 }),
      no('nome', 'art1.nome', { pai: 1 }),
      no('artigo', 'tit1', { rotulo: 'Art. 1º-A', pai: 0 }),
    ];
    const anomalias = validarNos(nos, 'html');
    expect(anomalias.filter((a) => a.gravidade === 'conflito')).toEqual([
      {
        tipo: 'endereco_duplicado',
        gravidade: 'conflito',
        endereco: 'tit1',
        mensagem:
          'O endereço tit1 aparece 2 vezes (TÍTULO I, Art. 1º-A). Corrija antes de publicar.',
      },
      {
        tipo: 'endereco_duplicado',
        gravidade: 'conflito',
        endereco: 'art1.nome',
        mensagem: 'O endereço art1.nome aparece 2 vezes (art1.nome). Corrija antes de publicar.',
      },
    ]);
    // Os quatro nós em conflito contam como "a confirmar": 4 de 5.
    expect(anomalias.at(-1)?.mensagem).toBe(
      'A fonte pode ter mudado de formato: 4 de 5 dispositivos (80%) ficaram a confirmar. Cole de novo pela página da norma; se continuar, avise.',
    );

    // No rascunho, o estruturador passa os nós do endereço em conflito para "a confirmar".
    const folha = (endereco: string): NoRascunho => ({
      tipo: 'nome',
      endereco,
      trechos: [],
      notas: [],
      redacoesAnteriores: [],
      status: 'vigente',
      confianca: 'media',
      filhos: [],
      linhas: { inicio: 0, fim: 0 },
    });
    const arvore = [{ ...folha('art1'), tipo: 'artigo' as const, filhos: [folha('art1.nome')] }];
    marcarConflitos(arvore, anomalias);
    expect(emOrdemDeLeitura(arvore).map(({ no: n }) => [n.endereco, n.confianca])).toEqual([
      ['art1', 'media'],
      ['art1.nome', 'a_confirmar'],
    ]);
  });

  it('artigo fora de ordem e artigo ausente: a volta aparece uma vez, e a falta não se repete depois dela', () => {
    const r = estruturar(
      blocos(
        'Art. 1º Um.',
        'Art. 2º Dois.',
        'Art. 9º Nove.',
        'Art. 3º Três, citado.',
        'Art. 4º Quatro, citado.',
        'Art. 10. Dez.',
      ),
    );
    expect(r.anomalias.map((a) => [a.tipo, a.endereco, a.linha, a.mensagem])).toEqual([
      [
        'artigo_ausente',
        'art9',
        2,
        'Entre o art. 2º e o art. 9º faltam artigos: confira se a página veio inteira.',
      ],
      [
        'artigo_fora_de_ordem',
        'art3',
        3,
        'O art. 3º vem depois do art. 9º: a numeração volta; confira se não é citação de outra lei.',
      ],
    ]);
  });

  it('CP, arts. 359-R e 359-T: o capítulo vetado some com o art. 359-S (artigo ausente, aviso)', () => {
    const r = estruturar(
      blocos(
        'Art. 359-R. Destruir ou inutilizar meios de comunicação ao público:',
        'Pena - reclusão, de 2 (dois) a 8 (oito) anos. (Incluído pela Lei nº 14.197, de 2021)',
        'CAPÍTULO V',
        '(Incluído pela Lei nº 14.197, de 2021)',
        '(VETADO) (Incluído pela Lei nº 14.197, de 2021)',
        'CAPÍTULO VI',
        '(Incluído pela Lei nº 14.197, de 2021)',
        'DISPOSIÇÕES COMUNS',
        'Art. 359-T. Não constitui crime previsto neste Título a manifestação crítica.',
      ),
    );
    expect(mensagens(r, 'artigo_ausente')).toEqual([
      'Antes do art. 359-R faltam artigos: confira se a página veio inteira.',
      'Entre o art. 359-R e o art. 359-T faltam artigos: confira se a página veio inteira.',
    ]);
  });

  it('artigo ausente: primeiro ≠ 1, salto de número, sufixo sem o número-base e salto de sufixo de uma letra', () => {
    const r = estruturar(
      blocos(
        'Art. 5º Cinco.',
        'Art. 5º-B. Sem o 5º-A.',
        'Art. 6º Seis.',
        'Art. 6º-A. Seis-A.',
        'Art. 6º-C. Sem o 6º-B.',
        'Art. 8º Sem o 7º.',
        'Art. 9º-A. Sem o 9º.',
        'Art. 9º-A-B. Sufixo de duas letras: não se confere.',
        'Art. 9º-B. Depois do 9º-A-B.',
      ),
    );
    expect(achadas(r)).toEqual([
      ['artigo_ausente', 'art5'],
      ['artigo_ausente', 'art5B'],
      ['artigo_ausente', 'art6C'],
      ['artigo_ausente', 'art8'],
      ['artigo_ausente', 'art9A'],
    ]);
  });

  it('numeração própria (ADCT): cada bloco recomeça no art. 1º; artigo único vale 1', () => {
    const nos = [
      no('artigo', 'art1', { rotulo: 'Art. 1º' }),
      no('artigo', 'art2', { rotulo: 'Art. 2º' }),
      no('bloco', 'adct', { estrutural: true }),
      no('artigo', 'adct.art1', { rotulo: 'Art. 1º', pai: 2 }),
      no('artigo', 'adct.art2', { rotulo: 'Art. 2º', pai: 2 }),
      no('artigo', 'dt.artUnico', { rotulo: 'Art. único' }),
    ];
    expect(validarNos(nos, 'html')).toEqual([]);
    expect(
      validarNos([...nos, no('artigo', 'adct.art1A', { rotulo: 'Art. 1º-A' })], 'html'),
    ).toEqual([
      {
        tipo: 'artigo_fora_de_ordem',
        gravidade: 'aviso',
        endereco: 'adct.art1A',
        mensagem:
          'O art. 1º-A (ADCT) vem depois do art. 2º (ADCT): a numeração volta; confira se não é citação de outra lei.',
      },
    ]);
  });

  it('bloco com numeração própria: a frase leva o prefixo depois do rótulo (CF, art. 2º do corpo e do ADCT)', () => {
    const r = estruturar(
      blocos(
        'Art. 1º A República Federativa do Brasil.',
        'Art. 2º São Poderes da União:',
        '§ 1º Um.',
        'Brasília, 5 de outubro de 1988.',
        'ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS',
        'Art. 1º. O Presidente prestará o compromisso.',
        'Art. 2º. No dia 7 de setembro de 1993:',
        '§ 1º Será assegurada a gratuidade.',
      ),
    );
    expect(r.anomalias.map((a) => [a.tipo, a.endereco, a.mensagem])).toEqual([
      [
        'paragrafo_1_sem_2',
        'art2',
        'O art. 2º tem § 1º sem § 2º: confira se não é parágrafo único.',
      ],
      [
        'paragrafo_1_sem_2',
        'adct.art2',
        'O art. 2º (ADCT) tem § 1º sem § 2º: confira se não é parágrafo único.',
      ],
    ]);
    // O prefixo vem do endereço: nos registros gravados, a mesma frase (a tela tira as repetidas).
    const gravados = [
      no('artigo', 'art1', { rotulo: 'Art. 1º' }),
      no('artigo', 'dt.art1', { rotulo: 'Art. 1º' }),
      no('artigo', 'dt.art5', { rotulo: 'Art. 5º' }),
      no('artigo', 'dt.art8', { rotulo: 'Art. 8º' }),
      no('paragrafo', 'dt.art8.parUnico', { rotulo: 'Parágrafo único', pai: 3 }),
      no('paragrafo', 'dt.art8.par2', { rotulo: '§ 2º', pai: 3 }),
    ];
    expect(validarNos(gravados, 'html').map((a) => a.mensagem)).toEqual([
      'Entre o art. 1º (DT) e o art. 5º (DT) faltam artigos: confira se a página veio inteira.',
      'Entre o art. 5º (DT) e o art. 8º (DT) faltam artigos: confira se a página veio inteira.',
      'O art. 8º (DT) tem parágrafo único e § 2º: confira se um deles não é redação antiga ou citação.',
    ]);
    // Sem rótulo, o endereço já traz o prefixo.
    expect(
      validarNos([no('artigo', 'art1'), no('artigo', 'adct.art3')], 'html').map((a) => a.mensagem),
    ).toEqual(['Antes do adct.art3 faltam artigos: confira se a página veio inteira.']);
  });

  it('LEP, art. 29, § 1º: alíneas sem inciso, uma anomalia por alínea com a mesma frase; sob inciso, nada (CP, art. 92, I)', () => {
    const r = estruturar(
      blocos(
        'Art. 1º Texto.',
        'Art. 2º São também efeitos da condenação:',
        'I - a perda de cargo, função pública ou mandato eletivo:',
        'a) quando aplicada pena privativa de liberdade por tempo igual ou superior a um ano;',
        'b) quando for aplicada pena privativa de liberdade por tempo superior a 4 (quatro) anos.',
        'Art. 3º O trabalho do preso será remunerado.',
        '§ 1° - O produto da remuneração pelo trabalho deverá atender:',
        'a) à indenização dos danos causados pelo crime;',
        'b) à assistência à família;',
        'c) a pequenas despesas pessoais;',
        '§ 2º - Ressalvadas outras aplicações legais, será depositada a parte restante.',
      ),
    );
    expect(achadas(r)).toEqual([
      ['alinea_sem_inciso', 'art3.par1.alA'],
      ['alinea_sem_inciso', 'art3.par1.alB'],
      ['alinea_sem_inciso', 'art3.par1.alC'],
    ]);
    expect(new Set(mensagens(r, 'alinea_sem_inciso'))).toEqual(
      new Set([
        'Há alíneas direto no parágrafo ou no caput, sem inciso (comum em lei anterior à LC 95/1998); ficaram como estão.',
      ]),
    );
    expect(r.anomalias.map((a) => a.linha)).toEqual([7, 8, 9]);
  });

  it('LC-SP 988, art. 14, parágrafo único: itens sem alínea, um por item com a mesma frase', () => {
    const r = estruturar(
      blocos(
        'Artigo 1º - Texto.',
        'Artigo 2º - O mandato do Defensor Público-Geral do Estado será de 2 (dois) anos.',
        'Parágrafo único - O mandato não impede a destituição, nas seguintes hipóteses:',
        '1. abuso de poder;',
        '2. conduta incompatível;',
        '3. grave omissão nos deveres do cargo.',
      ),
    );
    expect(achadas(r)).toEqual([
      ['item_sem_alinea', 'art2.parUnico.it1'],
      ['item_sem_alinea', 'art2.parUnico.it2'],
      ['item_sem_alinea', 'art2.parUnico.it3'],
    ]);
    expect(new Set(mensagens(r, 'item_sem_alinea'))).toEqual(
      new Set([
        'Há itens direto no inciso, no parágrafo ou no caput, sem alínea (comum em lei estadual ou anterior à LC 95/1998); ficaram como estão.',
      ]),
    );
  });

  it('parágrafo único com numerado: CP, arts. 92 (vigentes) e 216-A (o vetado conta); LC 80, art. 54 (vetados)', () => {
    const r = estruturar(
      blocos(
        'Art. 1º Texto.',
        'Art. 2º São também efeitos da condenação:',
        'Parágrafo único - Os efeitos de que trata este artigo não são automáticos. (Redação dada pela Lei nº 7.209, de 11.7.1984)',
        '§ 1º Os efeitos de que trata este artigo não são automáticos. (Redação dada pela Lei nº 14.994, de 2024)',
        '§ 2º Na hipótese de que trata o inciso II do caput deste artigo. (Incluído pela Lei nº 14.994, de 2024)',
        'Art. 3º Constranger alguém com o intuito de obter vantagem.',
        'Pena - detenção, de 1 (um) a 2 (dois) anos. (Incluído pela Lei nº 10.224, de 15 de 2001)',
        'Parágrafo único. (VETADO) (Incluído pela Lei nº 10.224, de 15 de 2001)',
        '§ 2º A pena é aumentada em até um terço se a vítima é menor de 18 (dezoito) anos. (Incluído pela Lei nº 12.015, de 2009)',
        'Art. 4º A Defensoria Pública do Distrito Federal tem por Chefe o Defensor Público-Geral.',
        'Parágrafo único. (VETADO)',
        '§ 2º (VETADO) (Incluído dada pela Lei Complementar nº 132, de 2009).',
      ),
    );
    expect(achadas(r)).toEqual([
      ['paragrafo_unico_com_numerado', 'art2'],
      ['paragrafo_unico_com_numerado', 'art3'],
      ['paragrafo_unico_com_numerado', 'art4'],
    ]);
    expect(mensagens(r, 'paragrafo_unico_com_numerado')).toEqual([
      'O art. 2º tem parágrafo único e § 1º: confira se um deles não é redação antiga ou citação.',
      'O art. 3º tem parágrafo único e § 2º: confira se um deles não é redação antiga ou citação.',
      'O art. 4º tem parágrafo único e § 2º: confira se um deles não é redação antiga ou citação.',
    ]);
  });

  it('parágrafo único com numerado: LEP, art. 124 (todos revogados) não avisa; o revogado não conta', () => {
    const revogado = (texto: string) =>
      b(tachado(texto), { texto: ' (Revogado pela Lei nº 14.843, de 2024)' });
    const r = estruturar(
      blocos(
        'Art. 1º A autorização será concedida por prazo não superior a 7 (sete) dias.',
        revogado('Parágrafo único. Quando se tratar de freqüência a curso profissionalizante.'),
        revogado('§ 1º Ao conceder a saída temporária, o juiz imporá ao beneficiário:'),
        revogado('§ 2º Quando se tratar de frequência a curso profissionalizante.'),
        revogado('§ 3º Nos demais casos, as autorizações de saída somente poderão ser concedidas.'),
      ),
    );
    expect(r.nos[0]?.filhos.map((f) => [f.endereco, f.status])).toEqual([
      ['art1.parUnico', 'revogado'],
      ['art1.par1', 'revogado'],
      ['art1.par2', 'revogado'],
      ['art1.par3', 'revogado'],
    ]);
    expect(r.anomalias).toEqual([]);
  });

  it('ECA, art. 263: a alteração do CP lida como dispositivos (itens, § 4º e parágrafo único)', () => {
    const r = estruturar(
      blocos(
        'Art. 1º Texto.',
        'Art. 2º O Decreto-Lei n.º 2.848, de 7 de dezembro de 1940 (Código Penal), passa a vigorar com as seguintes alterações:',
        '1) Art. 121 ............................................................',
        '§ 4º No homicídio culposo, a pena é aumentada de um terço.',
        '4) Art. 213 ..................................................................',
        'Parágrafo único. Se a ofendida é menor de catorze anos:',
        'Pena - reclusão de quatro a dez anos.',
        'Art. 3º Esta Lei entra em vigor noventa dias após sua publicação.',
      ),
    );
    expect(achadas(r)).toEqual([
      ['item_sem_alinea', 'art2.it1'],
      ['item_sem_alinea', 'art2.par4.it4'],
      ['paragrafo_unico_com_numerado', 'art2'],
    ]);
  });

  it('§ 1º sem § 2º: CP, arts. 168 (lei válida) e 234 (a fonte rotula "§ 1º." o parágrafo único)', () => {
    const r = estruturar(
      blocos(
        'Art. 1º Apropriar-se de coisa alheia móvel, de que tem a posse ou a detenção:',
        'Pena - reclusão, de um a quatro anos, e multa.',
        'Aumento de pena',
        '§ 1º - A pena é aumentada de um terço, quando o agente recebeu a coisa:',
        'I - em depósito necessário;',
        'Art. 2º Fazer, importar, exportar, adquirir ou ter sob sua guarda escrito obsceno:',
        'Pena - detenção, de seis meses a dois anos, ou multa.',
        '§ 1º. Incorre na mesma pena quem:',
        'I - vende, distribui ou expõe à venda qualquer dos objetos referidos neste artigo;',
        'Art. 3º Sem parágrafo.',
        'Art. 4º Com os dois.',
        '§ 1º Um.',
        '§ 2º Dois.',
      ),
    );
    expect(r.anomalias.map((a) => [a.tipo, a.endereco, a.mensagem])).toEqual([
      [
        'paragrafo_1_sem_2',
        'art1',
        'O art. 1º tem § 1º sem § 2º: confira se não é parágrafo único.',
      ],
      [
        'paragrafo_1_sem_2',
        'art2',
        'O art. 2º tem § 1º sem § 2º: confira se não é parágrafo único.',
      ],
    ]);
  });
});

describe('"a confirmar" acima de 20% (regra 12, 8.7)', () => {
  const lei = blocos('Art. 1º Texto:', 'I - um;', 'II - dois.', 'Art. 2º Texto.');

  it('texto puro: tudo a confirmar, com a frase do texto sem formatação', () => {
    const r = estruturar(lei, { formato: 'texto' });
    expect(r.anomalias).toEqual([
      {
        tipo: 'a_confirmar_acima_do_limite',
        gravidade: 'aviso',
        mensagem: 'O texto chegou sem formatação: 4 de 4 dispositivos (100%) ficaram a confirmar.',
      },
    ]);
  });

  it('HTML: 20% exatos não avisam; acima, avisa; confiança média não conta', () => {
    expect(LIMITE_A_CONFIRMAR).toBe(0.2);
    const nos = (aConfirmar: number, total: number, medias = 0) =>
      Array.from({ length: total }, (_, k) =>
        no('artigo', `art${String(k + 1)}`, {
          confianca: k < aConfirmar ? 'a_confirmar' : k < aConfirmar + medias ? 'media' : 'alta',
        }),
      );
    expect(validarNos(nos(1, 5), 'html')).toEqual([]);
    expect(validarNos(nos(200, 1_000, 800), 'html')).toEqual([]);
    expect(validarNos(nos(201, 1_000), 'html')).toEqual([
      {
        tipo: 'a_confirmar_acima_do_limite',
        gravidade: 'aviso',
        mensagem:
          'A fonte pode ter mudado de formato: 201 de 1.000 dispositivos (20%) ficaram a confirmar. Cole de novo pela página da norma; se continuar, avise.',
      },
    ]);
    expect(validarNos(nos(3, 7), 'texto').map((a) => a.mensagem)).toEqual([
      'O texto chegou sem formatação: 3 de 7 dispositivos (43%) ficaram a confirmar.',
    ]);
  });

  it('o rascunho e a validação avulsa dão as mesmas anomalias', () => {
    const r = estruturar(lei, { formato: 'texto' });
    expect(validarEstrutura(r)).toEqual(r.anomalias);
  });
});
