// Serviço da 9.2 com o Código Penal inteiro (colado do corpus): entrega da atividade, "o CP inteiro
// é gravado em < 5 s", medida do estruturador ao fim da transação (a sanitização, de 1 a 4 s, é da
// tela e fica fora). As duas páginas: a do portão, com todas as redações, e a compilada, que tem
// mais dispositivos vigentes. E a publicação (9.3) do CP, das compiladas da LEP e do ECA (o marco
// da leitura antecipada) e da LC 80 (as duas "SEÇÃO IV"), lida depois por janela (9.4).
import { sanitizarHtml } from '../../core/seguranca/sanitizador';
import { repositorioDeTeste } from '../../testes/repositorio';
import { abrirNorma, lerJanela } from './leitor';
import { emOrdemDeLeitura } from './ordem';
import type { NoRascunho } from './rascunho';
import {
  criarRascunho,
  descartarRascunho,
  publicarVersao,
  retomarRascunho,
  verificarPublicacao,
} from './servico';

const HTML = import.meta.glob<string>(
  [
    '../../../corpus/normas/cp*.colado.html',
    '../../../corpus/normas/lep-compilado.colado.html',
    '../../../corpus/normas/eca-compilado.colado.html',
    '../../../corpus/normas/lc80.colado.html',
  ],
  { query: '?raw', import: 'default', eager: false },
);

async function blocosDe(id: string) {
  const carregar = HTML[`../../../corpus/normas/${id}.colado.html`];
  if (!carregar) throw new Error(`sem colado: ${id}`);
  return sanitizarHtml(await carregar()).blocos;
}

describe('serviço (9.2) com o CP inteiro', () => {
  it.each(['cp', 'cp-compilado'])(
    '%s: gravado em < 5 s; retomado igual; descartado sem sobra',
    async (id) => {
      const blocos = await blocosDe(id);
      const { repo } = await repositorioDeTeste();

      const inicio = performance.now();
      const { norma, versao, rascunho } = await criarRascunho(repo, {
        blocos,
        origemEntrada: 'html',
      });
      // Medido em 25/09/2026 no Windows (fake-indexeddb): cerca de 2 s nas duas páginas.
      expect(performance.now() - inicio).toBeLessThan(5_000);

      const nos = emOrdemDeLeitura(rascunho.nos).length;
      expect(nos).toBeGreaterThan(1_300);
      expect(await repo.db.tabela('dispositivos').count()).toBe(nos);
      expect(await repo.db.tabela('textosDispositivo').count()).toBe(nos);
      expect(norma.tituloCurto).toBe('Decreto-Lei nº 2.848/1940');
      expect(versao.notaVigenciaMaisRecente).toEqual({ lei: 'Lei nº 15.517', ano: 2026 });
      expect(versao.notasDaNorma).toHaveLength(11);

      const retomado = await retomarRascunho(repo, versao.id);
      expect(retomado.rascunho).toEqual(rascunho);

      await descartarRascunho(repo, versao.id);
      for (const nome of [
        'normas',
        'versoesNorma',
        'dispositivos',
        'textosDispositivo',
        'anexos',
      ] as const) {
        expect(await repo.db.tabela(nome).count()).toBe(0);
      }
      expect(await repo.db.anexosConteudo.count()).toBe(0);
    },
    // Sanitizar, gravar, retomar (estrutura de novo) e descartar o CP: com a suíte inteira em
    // paralelo no Windows, passou de 60 s (29/09/2026).
    120_000,
  );
});

describe('publicação (9.3) com o corpus', () => {
  // As 11 páginas do corpus, medidas em 29/09/2026: nenhum conflito e nenhum "a confirmar"; só a
  // LC 80 tem aviso (a segunda "SEÇÃO IV" do Capítulo I do Título III e o nome dela).
  it.each([
    ['cp', []],
    ['lep-compilado', []],
    ['eca-compilado', []],
    ['lc80', ['tit3.cap1.sec4', 'tit3.cap1.sec4.nome']],
  ])(
    '%s: sem conflito, publicada e imutável',
    async (id, avisos) => {
      const blocos = await blocosDe(id);
      const { repo } = await repositorioDeTeste();
      const { norma, versao, rascunho } = await criarRascunho(repo, {
        blocos,
        origemEntrada: 'html',
      });
      const nos = emOrdemDeLeitura(rascunho.nos).length;

      const inicio = performance.now();
      const previa = await verificarPublicacao(repo, versao.id);
      expect(previa.conflitos).toEqual([]);
      expect(previa.avisos.map((a) => a.endereco)).toEqual(avisos);
      expect(previa).toMatchObject({ aConfirmar: 0, totalDispositivos: nos });

      const publicada = await publicarVersao(repo, versao.id);
      // Verificar e publicar o CP (2 mil dispositivos): centenas de milissegundos.
      expect(performance.now() - inicio).toBeLessThan(5_000);
      expect(publicada.relatorio).toEqual(previa);
      expect(publicada.versao.status).toBe('vigente');
      expect(publicada.norma.versaoVigenteId).toBe(versao.id);
      expect(await repo.db.tabela('dispositivos').count()).toBe(nos);
      expect(await repo.db.tabela('textosDispositivo').count()).toBe(nos);

      // Leitura (9.4): a árvore aberta e os textos lidos em janelas de 200 reproduzem o rascunho.
      const aberta = await abrirNorma(repo, norma.id);
      const naOrdem = emOrdemDeLeitura(rascunho.nos);
      const nivelDe = new Map<NoRascunho, number>();
      for (const { no, pai } of naOrdem) nivelDe.set(no, pai ? (nivelDe.get(pai) ?? 0) + 1 : 0);
      expect(aberta.nos.map((n) => [n.dispositivo.endereco, n.nivel])).toEqual(
        naOrdem.map(({ no }) => [no.endereco, nivelDe.get(no)]),
      );
      const lidos: string[] = [];
      for (let inicio = 0; inicio < aberta.nos.length; inicio += 200) {
        for (const item of await lerJanela(repo, aberta, { inicio, quantidade: 200 })) {
          lidos.push(item.texto ? item.texto.trechos.map((t) => t.texto).join('') : '(sem texto)');
        }
      }
      expect(lidos).toEqual(naOrdem.map(({ no }) => no.trechos.map((t) => t.texto).join('')));

      // Publicada, a árvore não se refaz nem se apaga, mesmo com o estruturador mais novo.
      await repo.colecao('versoesNorma').atualizar(versao.id, { versaoAdaptador: '0.4' });
      await expect(retomarRascunho(repo, versao.id)).rejects.toMatchObject({
        motivo: 'publicada',
      });
      await expect(descartarRascunho(repo, versao.id)).rejects.toMatchObject({
        motivo: 'publicada',
      });
      expect(await repo.db.tabela('dispositivos').count()).toBe(nos);
      expect(norma.id).toBe(publicada.norma.id);
    },
    120_000,
  );
});
