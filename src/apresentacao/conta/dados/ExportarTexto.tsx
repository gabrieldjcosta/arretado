import { useCallback } from 'react';
import type { Repositorio } from '../../../core/persistencia';
import { listarResumos } from '../../../dominios/notas/resumos';
import { montarZipLegivel } from './exportar-legivel';
import { baixar } from './rotulos';
import { listarFrases } from '../../../dominios/recall/servico';
import { useDados, useRepositorio } from '../../dados/contexto';
import {
  baixarTexto,
  formatarFrasesTexto,
  formatarResumosTexto,
  nomeArquivoExportacao,
  TEXTOS_EXPORTAR_TEXTO,
} from './textos-backup';

/** Seção de exportação em texto puro (.txt) de frases corretas e resumos. */
export function ExportarTexto() {
  const repo = useRepositorio();
  const carregar = useCallback(async (r: Repositorio) => {
    const [frasesRes, resumosRes, disciplinasRes, notasRes, cartoesRes, errosRes] =
      await Promise.all([
        listarFrases(r, {}, null, 10_000),
        listarResumos(r),
        r.colecao('disciplinas').todosDoUsuario(),
        r.colecao('notas').todosDoUsuario(),
        r.colecao('cartoes').todosDoUsuario(),
        r.colecao('erros').todosDoUsuario(),
      ]);
    const vivos = <T extends { excluidoEm: string | null }>(l: T[]) =>
      l.filter((x) => x.excluidoEm === null);
    const mapaDisciplinas: Record<string, string> = {};
    for (const d of disciplinasRes) {
      if (d.excluidoEm !== null) continue;
      mapaDisciplinas[d.id] = d.nome;
    }
    return {
      frases: frasesRes.itens,
      resumos: resumosRes,
      disciplinas: mapaDisciplinas,
      notas: vivos(notasRes),
      cartoes: vivos(cartoesRes),
      erros: vivos(errosRes),
    };
  }, []);

  const { dados } = useDados(carregar);

  const frases = dados?.frases ?? [];
  const resumos = dados?.resumos ?? [];
  const disciplinas = dados?.disciplinas ?? {};

  const semFrases = frases.length === 0;
  const semResumos = resumos.length === 0;

  const exportarFrases = () => {
    if (semFrases) return;
    const texto = formatarFrasesTexto(frases, disciplinas);
    const nome = nomeArquivoExportacao('frases', repo.ctx.agora());
    baixarTexto(texto, nome);
  };

  const exportarResumos = () => {
    if (semResumos) return;
    const texto = formatarResumosTexto(resumos, disciplinas);
    const nome = nomeArquivoExportacao('resumos', repo.ctx.agora());
    baixarTexto(texto, nome);
  };

  const exportarTudo = () => {
    if (!dados) return;
    const bytes = montarZipLegivel({
      resumos: dados.resumos,
      notas: dados.notas.filter((n) => n.tipo !== 'resumo'),
      frases: dados.frases,
      cartoes: dados.cartoes,
      erros: dados.erros,
      disciplinas: dados.disciplinas,
    });
    baixar(bytes, nomeArquivoExportacao('tudo', repo.ctx.agora()).replace('.txt', '.zip'));
  };

  return (
    <section className="cartao-bloco exportar-texto-secao" aria-labelledby="t-exportar-texto">
      <h2 id="t-exportar-texto">{TEXTOS_EXPORTAR_TEXTO.titulo}</h2>
      <p className="dica">{TEXTOS_EXPORTAR_TEXTO.dica}</p>
      <div className="botoes-exportar-texto">
        <button
          type="button"
          disabled={semFrases}
          onClick={exportarFrases}
          title={semFrases ? TEXTOS_EXPORTAR_TEXTO.semFrases : undefined}
        >
          {semFrases ? TEXTOS_EXPORTAR_TEXTO.semFrases : TEXTOS_EXPORTAR_TEXTO.frasesBotao}
        </button>
        <button
          type="button"
          disabled={semResumos}
          onClick={exportarResumos}
          title={semResumos ? TEXTOS_EXPORTAR_TEXTO.semResumos : undefined}
        >
          {semResumos ? TEXTOS_EXPORTAR_TEXTO.semResumos : TEXTOS_EXPORTAR_TEXTO.resumosBotao}
        </button>
        <button type="button" disabled={!dados} onClick={exportarTudo}>
          {TEXTOS_EXPORTAR_TEXTO.tudoBotao}
        </button>
      </div>
    </section>
  );
}
