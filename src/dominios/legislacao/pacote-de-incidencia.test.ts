import type { Bloco } from '../../core/seguranca/sanitizador';
import { repositorioDeTeste } from '../../testes/repositorio';
import {
  alternarEstrela,
  arvoreDaEstrela,
  estrelaEfetiva,
  estrelasDaNorma,
  estrelar,
  porAlvo,
} from './estrelas';
import { abrirNorma } from './leitor';
import { aplicarPacote, aplicarPacoteNaBiblioteca, enderecoDoArtigo } from './pacote-de-incidencia';
import { criarRascunho, publicarVersao } from './servico';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
// Título I > Capítulo I > { Seção I > (arts. 1–2, Subseção I > art. 3), Seção II > (arts. 4–5) }.
const LEI: Bloco[] = [
  linha('LEI Nº 1, DE 1 DE JANEIRO DE 2000.'),
  linha('Dispõe sobre testes.'),
  linha('TÍTULO I'),
  linha('DAS DISPOSIÇÕES'),
  linha('CAPÍTULO I'),
  linha('DO OBJETO'),
  linha('Seção I'),
  linha('Da Pena'),
  linha('Art. 1º A pena é esta.'),
  linha('Art. 2º A outra pena.'),
  linha('§ 1º O parágrafo.'),
  linha('I - o inciso;'),
  linha('Subseção I'),
  linha('Da Multa Leve'),
  linha('Art. 3º A multa leve.'),
  linha('Seção II'),
  linha('Da Multa'),
  linha('Art. 4º A multa.'),
  linha('Art. 5º (VETADO).'),
];

async function publicada() {
  const { repo } = await repositorioDeTeste();
  const { versao, norma } = await criarRascunho(repo, {
    blocos: LEI,
    origemEntrada: 'html',
    tituloCurto: 'Teste',
  });
  await publicarVersao(repo, versao.id, { aceitarAConfirmar: true });
  const aberta = await abrirNorma(repo, norma.id);
  const arvore = arvoreDaEstrela(norma.id, aberta.nos);
  const ids = new Map(aberta.nos.map((n) => [n.dispositivo.endereco, n.dispositivo.id]));
  const id = (endereco: string) => {
    const achado = ids.get(endereco);
    if (!achado) throw new Error(`sem ${endereco}`);
    return achado;
  };
  const enderecoDe = new Map([...ids].map(([e, i]) => [i, e]));
  return { repo, arvore, id, enderecoDe };
}

describe('aplicarPacote', () => {
  it('converte número em endereço', () => {
    expect(enderecoDoArtigo('180-A')).toBe('art180A');
  });

  it('grava estrela de pacote, respeita escolhas e reporta ausentes', async () => {
    const { repo, arvore, id, enderecoDe } = await publicada();
    await estrelar(repo, arvore, id('art1'));
    const r = await aplicarPacote(
      repo,
      arvore,
      '11111111-1111-4111-8111-111111111111',
      ['1', '2', '5', '99'],
      enderecoDe,
    );
    expect(r).toEqual({ gravadas: ['2'], ausentes: ['5', '99'], mantidas: ['1'] });
    const gravadas = porAlvo(await estrelasDaNorma(repo, arvore.normaId));
    expect(estrelaEfetiva(arvore, gravadas, id('art2'))).toEqual({
      estrelado: true,
      origem: 'pacote',
    });
    expect(gravadas.get(id('art2'))?.pacoteId).toBe('11111111-1111-4111-8111-111111111111');
    const de = await aplicarPacote(
      repo,
      arvore,
      '11111111-1111-4111-8111-111111111111',
      ['2'],
      enderecoDe,
    );
    expect(de.mantidas).toEqual(['2']);
  });

  it('o usuário tira a estrela de pacote com um toque', async () => {
    const { repo, arvore, id, enderecoDe } = await publicada();
    await aplicarPacote(repo, arvore, '11111111-1111-4111-8111-111111111111', ['4'], enderecoDe);
    const m = await alternarEstrela(repo, arvore, id('art4'));
    expect(m.estado.estrelado).toBe(false);
    expect(m.estrelas).toHaveLength(0);
  });

  it('estrela de pacote no artigo não corta a herança de cima', async () => {
    const { repo, arvore, id, enderecoDe } = await publicada();
    await estrelar(repo, arvore, id('tit1.cap1.sec1'));
    const r = await aplicarPacote(
      repo,
      arvore,
      '11111111-1111-4111-8111-111111111111',
      ['2'],
      enderecoDe,
    );
    expect(r.mantidas).toEqual(['2']);
  });
  it('aplica à norma adicionada do acervo e relata a que falta', async () => {
    const { repo, arvore, id } = await publicada();
    await repo.colecao('normas').atualizar(arvore.normaId, {
      origemAcervo: { id: 'lei-x-1-2000', versao: 1, hash: 'a'.repeat(64) },
    });
    const r = await aplicarPacoteNaBiblioteca(repo, {
      id: '11111111-1111-4111-8111-111111111111',
      normas: { 'lei-x-1-2000': ['2', '4'], 'lei-y-2-2000': ['1'] },
    });
    expect(r.semNorma).toEqual(['lei-y-2-2000']);
    expect(r.porNorma['lei-x-1-2000']?.gravadas).toEqual(['2', '4']);
    const gravadas = porAlvo(await estrelasDaNorma(repo, arvore.normaId));
    expect(gravadas.get(id('art4'))?.origemTipo).toBe('pacote');
  });
});
