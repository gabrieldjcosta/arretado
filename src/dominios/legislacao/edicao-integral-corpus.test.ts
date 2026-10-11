// A edição integral (10.4) nas páginas do corpus: salvar sem mudar nada não regrava nenhum
// registro; mudar uma linha muda só o dispositivo dela; o rótulo que o texto integral escreve é
// lido de volta como o mesmo tipo e número (a linha mudada no lugar não troca de número sozinha).
import { sanitizarHtml } from '../../core/seguranca/sanitizador';
import { repositorioDeTeste } from '../../testes/repositorio';
import { dispositivosDaNorma, todos } from './consultas';
import { lerTextoIntegral, salvarTextoIntegral } from './edicao';
import { linhasDoRascunho } from './edicao-arvore';
import { lerLinhaDigitada, textoIntegral } from './edicao-integral';
import { criarRascunho } from './servico';

const HTML = import.meta.glob<string>(
  [
    '../../../corpus/normas/lep-compilado.colado.html',
    '../../../corpus/normas/cp-compilado.colado.html',
    '../../../corpus/normas/cf.colado.html',
  ],
  { query: '?raw', import: 'default', eager: false },
);

const LIDOS = new Set(['artigo', 'paragrafo', 'inciso', 'alinea', 'item', 'capitulo', 'titulo']);

describe.each(['lep-compilado', 'cp-compilado', 'cf'])('edição integral em %s (10.4)', (id) => {
  it('sem mudar nada, nada muda; uma linha mudada muda só um dispositivo', async () => {
    const carregar = HTML[`../../../corpus/normas/${id}.colado.html`];
    if (!carregar) throw new Error(`sem colado: ${id}`);
    const { blocos } = sanitizarHtml(await carregar());
    const { repo } = await repositorioDeTeste();
    const criado = await criarRascunho(repo, { blocos, origemEntrada: 'html' });
    const versaoId = criado.versao.id;
    const crus = async () => {
      const ds = await dispositivosDaNorma(repo.colecao('dispositivos'), criado.norma.id, false);
      const ts = await todos(repo.colecao('textosDispositivo'), {
        indice: 'versaoId',
        de: versaoId,
        ate: versaoId,
      });
      return { ds, ts: new Map(ts.map((t) => [t.dispositivoId, t])) };
    };
    const antes = await crus();

    // O rótulo escrito é lido de volta igual.
    const linhas = linhasDoRascunho(antes.ds, antes.ts);
    const errados = textoIntegral(linhas)
      .filter((l) => l.papel === 'cabeca' && LIDOS.has(linhas[l.dono]?.tipo ?? ''))
      .filter((l) => {
        const lido = lerLinhaDigitada(l.texto);
        const linha = linhas[l.dono];
        return lido?.tipo !== linha?.tipo || lido?.segmento !== linha?.segmento;
      });
    expect(errados.slice(0, 5).map((l) => l.texto.slice(0, 60))).toEqual([]);

    const base = await lerTextoIntegral(repo, versaoId);
    const igual = await salvarTextoIntegral(repo, versaoId, base, { base });
    expect(igual).toMatchObject({ alterados: 0, novos: 0, removidos: 0 });
    const depois = await crus();
    expect(JSON.stringify(depois.ds)).toBe(JSON.stringify(antes.ds));
    expect(JSON.stringify([...depois.ts.values()])).toBe(JSON.stringify([...antes.ts.values()]));

    // Uma linha do meio, mudada no lugar.
    const texto = base.split('\n');
    const k = texto.findIndex((l, i) => i > texto.length / 2 && l.startsWith('Art. '));
    texto[k] = `${texto[k] ?? ''} (texto acrescentado)`;
    const resumo = await salvarTextoIntegral(repo, versaoId, texto.join('\n'), { base });
    expect(resumo).toMatchObject({ alterados: 1, novos: 0, removidos: 0 });
    const editado = await crus();
    const mudados = editado.ds.filter(
      (d, i) =>
        JSON.stringify(d) !== JSON.stringify(antes.ds[i]) ||
        JSON.stringify(editado.ts.get(d.id)) !== JSON.stringify(antes.ts.get(d.id)),
    );
    expect(mudados).toHaveLength(1);
  }, 60_000);
});
