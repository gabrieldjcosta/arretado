// A reconstrução da 10.2 sobre as páginas do corpus: sem mudar nada, devolve a árvore gravada
// (pai, categoria, ordem e, recalculados do zero, os endereços). É o que garante que editar uma
// linha não mexe no resto da norma.
import { sanitizarHtml } from '../../core/seguranca/sanitizador';
import { repositorioDeTeste } from '../../testes/repositorio';
import { dispositivosDaNorma, todos } from './consultas';
import { linhasDoRascunho, reconstruir } from './edicao-arvore';
import { criarRascunho } from './servico';

const HTML = import.meta.glob<string>(
  [
    '../../../corpus/normas/lep-compilado.colado.html',
    '../../../corpus/normas/eca-compilado.colado.html',
    '../../../corpus/normas/lc80.colado.html',
    '../../../corpus/normas/cp-compilado.colado.html',
    '../../../corpus/normas/cf.colado.html',
  ],
  { query: '?raw', import: 'default', eager: false },
);

describe.each(['lep-compilado', 'eca-compilado', 'lc80', 'cp-compilado', 'cf'])(
  'reconstruir %s sem mudar nada (10.2)',
  (id) => {
    it('devolve a árvore gravada', async () => {
      const carregar = HTML[`../../../corpus/normas/${id}.colado.html`];
      if (!carregar) throw new Error(`sem colado: ${id}`);
      const { blocos } = sanitizarHtml(await carregar());
      const { repo } = await repositorioDeTeste();
      const criado = await criarRascunho(repo, { blocos, origemEntrada: 'html' });
      const ds = await dispositivosDaNorma(repo.colecao('dispositivos'), criado.norma.id, false);
      const textos = new Map(
        (
          await todos(repo.colecao('textosDispositivo'), {
            indice: 'versaoId',
            de: criado.versao.id,
            ate: criado.versao.id,
          })
        ).map((t) => [t.dispositivoId, t]),
      );
      const porId = new Map(ds.map((d) => [d.id, d]));
      const confere = (saida: ReturnType<typeof reconstruir>, comEndereco: boolean) => {
        expect(saida).toHaveLength(ds.length);
        const diferentes = saida.filter((s) => {
          const d = porId.get(s.id);
          return (
            !d ||
            d.paiId !== s.dados.paiId ||
            d.categoria !== s.dados.categoria ||
            d.tipo !== s.dados.tipo ||
            d.ordem !== s.dados.ordem ||
            d.rotulo !== s.dados.rotulo ||
            (comEndereco && d.endereco !== s.dados.endereco)
          );
        });
        expect(
          diferentes.slice(0, 3).map((s) => [s.dados.endereco, porId.get(s.id)?.endereco]),
        ).toEqual([]);
      };
      // Como está: nada muda.
      confere(reconstruir(linhasDoRascunho(ds, textos)), true);
      // Endereço recalculado do zero (sem lembrar o gravado): o mesmo, só a ordem é livre.
      const linhas = linhasDoRascunho(ds, textos);
      for (const l of linhas) {
        delete l.antes;
        if (l.nome) delete l.nome.endereco;
      }
      const saida = reconstruir(linhas);
      expect(saida).toHaveLength(ds.length);
      const erradas = saida.filter((s) => porId.get(s.id)?.endereco !== s.dados.endereco);
      expect(erradas.slice(0, 3).map((s) => [s.dados.endereco, porId.get(s.id)?.endereco])).toEqual(
        [],
      );
    }, 120_000);
  },
);
