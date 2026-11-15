// A linha de retorno do Agora (D-D25, itens 6 e 11; desvio 476): o que antes eram os avisos do Hoje, numa linha
// quieta no fim da tela, uma por vez. Nesta ordem: versão nova pronta, backup, a lei mudou e o Lembrete.
import { useCallback, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { Repositorio } from '../../../core/persistencia';
import { obterPreferencias } from '../../../core/preferencias';
import { itensComVersaoNova } from '../../../dominios/acervo/atualizacao';
import type { FonteDoAcervo } from '../../../dominios/acervo/fonte';
import { avisosDeLeiMudou } from '../../../dominios/acervo/pendencias';
import { dispensarPorDias, lembreteDeBackup } from '../../../dominios/dados/lembrete-de-backup';
import { aplicarAtualizacao, useAtualizacaoPronta } from '../../../offline/registro';
import {
  carregarBackup,
  fraseDoBackup,
  gravarDispensa,
  lerDispensa,
} from '../../componentes/backup-pendente';
import { linhasDaLeiQueMudou } from '../../componentes/lei-mudou';
import { DialogoDoLembrete } from '../../componentes/lembrete/DialogoDoLembrete';
import { useRepositorio } from '../../dados/contexto';
import { useFonteAcervo } from '../../dados/fonteAcervoContexto';
import { useDadosDoFio } from '../dados/sem-vazio';

/** Quanto do Lembrete cabe na linha; o resto está no diálogo. */
const COMECO_DO_LEMBRETE = 60;

async function doAparelho(repo: Repositorio) {
  const [backup, preferencias, leis] = await Promise.all([
    carregarBackup(repo),
    obterPreferencias(repo),
    avisosDeLeiMudou(repo),
  ]);
  return { backup, lembrete: (preferencias.lembrete ?? '').trim(), leis };
}

// O índice do acervo é pedido uma vez por fonte: `useDados` relê a cada mudança no Aparelho, e cada leitura seria uma
// ida à rede. Sem rede não há índice, e a próxima leitura tenta de novo.
const indices = new WeakMap<FonteDoAcervo, ReturnType<FonteDoAcervo['listar']>>();
function indiceDe(fonte: FonteDoAcervo) {
  let indice = indices.get(fonte);
  if (!indice) {
    indice = fonte.listar();
    indices.set(fonte, indice);
    indice.catch(() => indices.delete(fonte));
  }
  return indice;
}

export function RetornoM() {
  const repo = useRepositorio();
  const fonte = useFonteAcervo();
  const versaoNova = useAtualizacaoPronta();
  const { dados, deAntes } = useDadosDoFio('retorno', doAparelho);
  const { dados: novas } = useDadosDoFio(
    'retorno-acervo',
    useCallback(
      (r: Repositorio) =>
        indiceDe(fonte).then(
          (i) => itensComVersaoNova(r, i.itens),
          () => [],
        ),
      [fonte],
    ),
  );
  const [versaoAdiada, setVersaoAdiada] = useState(false);
  const [leiAdiada, setLeiAdiada] = useState(false);
  const [dispensadoAte, setDispensadoAte] = useState(lerDispensa);
  const [lembrando, setLembrando] = useState(false);
  const [semLinha, setSemLinha] = useState(false);

  let texto: string | undefined;
  let acao: ReactNode;
  let depois: (() => void) | undefined;
  const agora = repo.ctx.agora();
  const backup = dados
    ? lembreteDeBackup({ ...dados.backup, agora, dispensadoAte })
    : { mostrar: false as const };
  const [lei, ...outrasLeis] = linhasDaLeiQueMudou(dados?.leis ?? [], novas ?? []);
  if (versaoNova && !versaoAdiada) {
    texto = 'Uma versão nova do Arretado está pronta.';
    acao = (
      <button type="button" className="m-entrar-codigo" onClick={aplicarAtualizacao}>
        Atualizar
      </button>
    );
    depois = () => {
      setVersaoAdiada(true);
    };
  } else if (backup.mostrar) {
    texto = fraseDoBackup(backup.dias);
    acao = (
      <Link to="/conta/dados" className="m-entrar-codigo">
        Fazer agora
      </Link>
    );
    depois = () => {
      const ate = dispensarPorDias(agora);
      gravarDispensa(ate);
      setDispensadoAte(ate);
    };
  } else if (lei && !leiAdiada) {
    texto =
      outrasLeis.length > 0
        ? `${lei.texto} E mais ${String(outrasLeis.length)} ${outrasLeis.length === 1 ? 'norma' : 'normas'}.`
        : lei.texto;
    acao = (
      <Link to={lei.para} className="m-entrar-codigo" aria-label={lei.aria}>
        {lei.rotulo}
      </Link>
    );
    // Como a versão nova: passa a vez nesta visita, e volta na próxima enquanto a lei estiver por ver.
    depois = () => {
      setLeiAdiada(true);
    };
  } else if (dados?.lembrete) {
    const comeco = dados.lembrete.split('\n', 1)[0] ?? '';
    texto = `Lembrete: ${
      comeco.length > COMECO_DO_LEMBRETE
        ? `${comeco.slice(0, COMECO_DO_LEMBRETE).trimEnd()}…`
        : comeco
    }`;
    acao = (
      <button
        type="button"
        className="m-entrar-codigo"
        aria-label="Abrir o Lembrete"
        onClick={() => {
          setLembrando(true);
        }}
      >
        Abrir
      </button>
    );
  }

  // A área do fio estica até o fim da tela: uma linha que chegasse com a pessoa já no Agora a encolheria e subiria o
  // que ela está para tocar. Depois que os dados do Aparelho chegam sem linha, a tela fica sem linha; o que chegar
  // mais tarde (o índice do acervo pela rede, uma versão nova) aparece na próxima vez que o Agora montar. Só a
  // leitura desta visita trava: a guardada da visita anterior não sabe do Lembrete escrito no Varal nesse meio-tempo.
  if (dados && !deAntes && texto === undefined && !semLinha) setSemLinha(true);

  return (
    <>
      {texto !== undefined && !semLinha && (
        <p className="m-quieto m-linha-de-retorno" role="status">
          <span>{texto}</span>
          <span className="m-linha-de-retorno-acoes">
            {acao}
            {depois && (
              <button type="button" className="m-entrar-codigo" onClick={depois}>
                Depois
              </button>
            )}
          </span>
        </p>
      )}
      <DialogoDoLembrete
        aberto={lembrando}
        aoFechar={() => {
          setLembrando(false);
        }}
      />
    </>
  );
}
