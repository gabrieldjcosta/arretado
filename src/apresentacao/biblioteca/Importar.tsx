import { useEffect, useRef, useState, type ClipboardEvent, type SubmitEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { Norma, VersaoDeNorma } from '../../core/modelo';
import {
  EntradaGrandeDemais,
  sanitizarHtml,
  textoParaBlocos,
  type Bloco,
} from '../../core/seguranca/sanitizador';
import { EdicaoInvalida, escreverNorma } from '../../dominios/legislacao/edicao';
import type { Rascunho } from '../../dominios/legislacao/rascunho';
import {
  criarRascunho,
  descartarRascunho,
  PublicacaoBloqueada,
  publicarVersao,
  RascunhoIndisponivel,
  retomarRascunho,
  verificarPublicacao,
  versaoComMesmaFonte,
  type RelatorioDePublicacao,
} from '../../dominios/legislacao/servico';
import { buscarPagina, FalhaNaBusca } from '../../integracoes/url/buscar';
import { sumarioDoRascunho, type SumarioDoRascunho } from '../../dominios/legislacao/sumario';
import { Dialogo } from '../componentes/Dialogo';
import { useRepositorio } from '../dados/contexto';
import { EdicaoIntegral } from './EdicaoIntegral';
import { RevisaoDoRascunho } from './RevisaoDoRascunho';
import { fraseDescarte, rotuloTipo } from './rotulos';

interface Importacao {
  norma: Norma;
  versao: VersaoDeNorma;
  rascunho: Rascunho;
  relatorio: RelatorioDePublicacao;
  sumario: SumarioDoRascunho;
}

type Fase =
  | { tipo: 'colar' }
  | { tipo: 'processando'; etapa: string; passo: number; passos: number }
  | { tipo: 'repetida'; norma: Norma; versao: VersaoDeNorma }
  /** `escrever`: norma escrita do zero, com o texto inteiro já aberto. */
  | { tipo: 'sumario'; importacao: Importacao; escrever?: boolean }
  | { tipo: 'indisponivel'; mensagem: string };

const ABRINDO: Fase = {
  tipo: 'processando',
  etapa: 'Abrindo o rascunho guardado',
  passo: 1,
  passos: 1,
};

/** Os passos de colar: o último, a gravação, é o longo numa lei grande (CP, CF). */
const etapa = (passo: number, texto: string): Fase => ({
  tipo: 'processando',
  etapa: texto,
  passo,
  passos: 4,
});

/** Acima disso, o resto dos avisos vira uma contagem. */
const MAX_AVISOS = 50;

const AVISO_COMPILADA =
  'Nenhuma linha tachada: a página parece a compilada, só com o texto vigente, sem as redações anteriores.';

/**
 * Dá ao navegador a chance de pintar o andamento antes de um passo que prende a thread principal
 * (o sanitizador precisa do DOM; o CP leva segundos: "Importar o CP trava a tela").
 */
const respirar = () =>
  new Promise<void>((pronto) => {
    setTimeout(pronto, 50);
  });

/** HTML pelo sanitizador; o texto puro é a reserva, quando não há HTML ou ele não traz texto. */
function blocosDoColado(html: string, texto: string): { blocos: Bloco[]; html: boolean } {
  if (html.trim() !== '') {
    const { blocos } = sanitizarHtml(html);
    if (blocos.length > 0) return { blocos, html: true };
  }
  return { blocos: textoParaBlocos(texto), html: false };
}

function importacaoDe(
  r: { norma: Norma; versao: VersaoDeNorma; rascunho: Rascunho },
  relatorio: RelatorioDePublicacao,
): Importacao {
  return { ...r, relatorio, sumario: sumarioDoRascunho(r.rascunho) };
}

/** Avisos do estruturador e da verificação, sem repetir os conflitos (que vêm à parte). */
function avisosDe({ rascunho, relatorio, sumario }: Importacao): string[] {
  const conflitos = new Set(relatorio.conflitos.map((a) => a.mensagem));
  const avisos = new Set<string>(sumario.pareceCompilada ? [AVISO_COMPILADA] : []);
  for (const a of [...rascunho.anomalias, ...relatorio.avisos]) {
    if (a.tipo !== 'sem_artigos' && !conflitos.has(a.mensagem)) avisos.add(a.mensagem);
  }
  return [...avisos];
}

const plural = (n: number, um: string, varios: string) =>
  `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`;

/**
 * Importar norma por colagem (F2, 9.5; Parte 2 §9.2 e §10.6, fluxo 1): o `paste` com o HTML da
 * página (o texto puro de reserva) vira o rascunho gravado, e o sumário leva à publicação.
 * `/biblioteca/importar/:versaoId` retoma um rascunho pendente (`retomarRascunho` antes de
 * verificar: o relatório só sai dele, e ele refaz a árvore se o estruturador mudou).
 */
export function Importar() {
  const { versaoId } = useParams();
  const repo = useRepositorio();
  const navegar = useNavigate();
  const [fase, setFase] = useState<Fase>(versaoId ? ABRINDO : { tipo: 'colar' });
  const [falha, setFalha] = useState<string | null>(null);
  const [digitado, setDigitado] = useState('');
  const [endereco, setEndereco] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [tituloNovo, setTituloNovo] = useState('');
  // Muda depois de salvar o texto inteiro: a revisão é remontada com a árvore nova.
  const [geracao, setGeracao] = useState(0);
  // Muda a cada mudança no rascunho (revisão ou texto inteiro): o texto inteiro se relê.
  const [mudancas, setMudancas] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const [descartando, setDescartando] = useState(false);
  const [falhaDescarte, setFalhaDescarte] = useState<string | null>(null);
  // Trava contra clique duplo (e colar duas vezes): o estado só muda no próximo render.
  const trava = useRef(false);
  // O rascunho cujo sumário está na tela: ao colar, a rota ganha o id sem retomar de novo.
  const exibida = useRef<string | null>(null);
  const titulo1 = useRef<HTMLHeadingElement>(null);

  const noSumario = fase.tipo === 'sumario';
  useEffect(() => {
    // A área de colagem sai da tela: o foco vai para o título, e o leitor de tela recomeça dali.
    if (noSumario) titulo1.current?.focus();
  }, [noSumario]);

  useEffect(() => {
    if (!versaoId || exibida.current === versaoId) return;
    const pedido = { cancelado: false };
    void (async () => {
      try {
        await respirar();
        const retomado = await retomarRascunho(repo, versaoId);
        const relatorio = await verificarPublicacao(repo, versaoId);
        if (pedido.cancelado) return;
        exibida.current = versaoId;
        setTitulo(retomado.norma.tituloCurto);
        setFase({ tipo: 'sumario', importacao: importacaoDe(retomado, relatorio) });
      } catch (e) {
        if (pedido.cancelado) return;
        setFase({
          tipo: 'indisponivel',
          mensagem:
            e instanceof RascunhoIndisponivel
              ? e.message
              : 'Não foi possível abrir o rascunho. Recarregue a página; se continuar, feche as outras abas do Arretado.',
        });
      }
    })();
    return () => {
      pedido.cancelado = true;
    };
  }, [repo, versaoId]);

  function mostrar(importacao: Importacao, escrever = false) {
    exibida.current = importacao.versao.id;
    setTitulo(importacao.norma.tituloCurto);
    setFalha(null);
    setFase({ tipo: 'sumario', importacao, escrever });
  }

  /** Inserção manual (10.4): súmula, enunciado ou norma pequena, a partir de um artigo vazio. */
  async function escrever(e: SubmitEvent) {
    e.preventDefault();
    if (trava.current || tituloNovo.trim() === '') return;
    trava.current = true;
    setFalha(null);
    try {
      const { versaoId: novaId } = await escreverNorma(repo, tituloNovo);
      const retomado = await retomarRascunho(repo, novaId);
      const relatorio = await verificarPublicacao(repo, novaId);
      setTituloNovo('');
      mostrar(importacaoDe(retomado, relatorio), true);
      void navegar(`/biblioteca/importar/${novaId}`, { replace: true });
    } catch (excecao) {
      setFalha(
        excecao instanceof EdicaoInvalida
          ? excecao.message
          : 'Não foi possível começar a norma. Tente de novo; se continuar, relate o problema.',
      );
    } finally {
      trava.current = false;
    }
  }

  async function importar(html: string, texto: string, urlOficial?: string) {
    if (trava.current) return;
    trava.current = true;
    setFalha(null);
    try {
      setFase(etapa(1, urlOficial ? 'Limpando a página buscada' : 'Limpando a página colada'));
      await respirar();
      const colado = blocosDoColado(html, texto);
      if (colado.blocos.length === 0) {
        setFase({ tipo: 'colar' });
        setFalha('O que foi colado não tem texto. Copie a lei na página oficial e cole de novo.');
        return;
      }
      setFase(etapa(2, 'Procurando a mesma norma'));
      const existente = await versaoComMesmaFonte(repo, colado.blocos);
      if (existente) {
        setFase({ tipo: 'repetida', ...existente });
        return;
      }
      setFase(etapa(3, 'Separando artigos, parágrafos e incisos'));
      await respirar();
      const criado = await criarRascunho(
        repo,
        {
          blocos: colado.blocos,
          origemEntrada: urlOficial ? 'url' : colado.html ? 'html' : 'texto',
          ...(urlOficial ? { urlOficial } : {}),
        },
        {
          antesDeGravar: async () => {
            setFase(etapa(4, 'Guardando o rascunho'));
            await respirar();
          },
        },
      );
      const relatorio = await verificarPublicacao(repo, criado.versao.id);
      setDigitado('');
      mostrar(importacaoDe(criado, relatorio));
      // Recarregar a página (ou voltar depois) retoma este rascunho.
      void navegar(`/biblioteca/importar/${criado.versao.id}`, { replace: true });
    } catch (e) {
      setFase({ tipo: 'colar' });
      setFalha(
        e instanceof EntradaGrandeDemais
          ? `${e.message} Copie só a lei, sem o resto da página.`
          : 'Não foi possível importar o que foi colado. Tente de novo; se continuar, relate o problema.',
      );
    } finally {
      trava.current = false;
    }
  }

  /** 12.3: busca pelo Worker; qualquer falha deixa colar como caminho (a rede é só atalho). */
  async function buscar(e: SubmitEvent) {
    e.preventDefault();
    if (trava.current || buscando) return;
    setFalha(null);
    setBuscando(true);
    try {
      const pagina = await buscarPagina(endereco);
      setBuscando(false);
      await importar(pagina.html, '', pagina.urlFinal);
    } catch (excecao) {
      setFalha(
        excecao instanceof FalhaNaBusca
          ? excecao.message
          : 'Não foi possível buscar a página. Copie a lei na página oficial e cole abaixo.',
      );
    } finally {
      setBuscando(false);
    }
  }

  function aoColar(e: ClipboardEvent<HTMLTextAreaElement>) {
    const html = e.clipboardData.getData('text/html');
    const texto = e.clipboardData.getData('text/plain');
    if (html.trim() === '' && texto.trim() === '') return;
    // Nada entra no campo: a lei inteira no textarea travaria a tela à toa.
    e.preventDefault();
    void importar(html, texto);
  }

  function retomar(versao: VersaoDeNorma) {
    setFase(ABRINDO);
    void navegar(`/biblioteca/importar/${versao.id}`, { replace: true });
  }

  function colarOutra() {
    exibida.current = null;
    setFalha(null);
    setFase({ tipo: 'colar' });
    void navegar('/biblioteca/importar', { replace: true });
  }

  /** Depois de confirmar ou corrigir: o relatório (contagem, conflitos, avisos) sai de novo. */
  async function atualizarRelatorio(importacao: Importacao, escrever?: boolean) {
    const relatorio = await verificarPublicacao(repo, importacao.versao.id);
    setMudancas((m) => m + 1);
    setFase({ tipo: 'sumario', importacao: { ...importacao, relatorio }, escrever });
  }

  /** Depois de salvar o texto inteiro: relatório novo e revisão remontada. */
  async function depoisDoTextoInteiro(importacao: Importacao) {
    setGeracao((g) => g + 1);
    await atualizarRelatorio(importacao, true);
  }

  async function publicar(e: SubmitEvent, importacao: Importacao) {
    e.preventDefault();
    const tituloCurto = titulo.trim();
    if (trava.current || tituloCurto === '' || importacao.relatorio.conflitos.length > 0) return;
    trava.current = true;
    setOcupado(true);
    setFalha(null);
    try {
      const { norma } = await publicarVersao(repo, importacao.versao.id, {
        tituloCurto,
        aceitarAConfirmar: importacao.relatorio.aConfirmar > 0,
      });
      void navegar('/biblioteca', {
        replace: true,
        state: { aviso: `${norma.tituloCurto} publicada.` },
      });
    } catch (excecao) {
      if (excecao instanceof PublicacaoBloqueada) {
        setFase({ tipo: 'sumario', importacao: { ...importacao, relatorio: excecao.relatorio } });
        setFalha(excecao.message);
      } else if (excecao instanceof RascunhoIndisponivel) {
        // Outra aba publicou ou descartou antes.
        setFase({ tipo: 'indisponivel', mensagem: excecao.message });
      } else {
        setFalha(
          'Não foi possível publicar. Feche as outras abas do Arretado e tente de novo; o rascunho continua guardado.',
        );
      }
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }

  function descartar(importacao: Importacao, depois: 'biblioteca' | 'colar') {
    if (trava.current) return;
    trava.current = true;
    setOcupado(true);
    setFalhaDescarte(null);
    const concluir = () => {
      trava.current = false;
      setOcupado(false);
      setDescartando(false);
      if (depois === 'colar') {
        colarOutra();
      } else {
        void navegar('/biblioteca', {
          replace: true,
          state: { aviso: `Importação de ${importacao.norma.tituloCurto} descartada.` },
        });
      }
    };
    descartarRascunho(repo, importacao.versao.id).then(concluir, (e: unknown) => {
      // Já descartado por outra aba: colar de novo segue do mesmo jeito.
      if (depois === 'colar' && e instanceof RascunhoIndisponivel && e.motivo === 'inexistente') {
        concluir();
        return;
      }
      trava.current = false;
      setOcupado(false);
      const mensagem =
        e instanceof RascunhoIndisponivel
          ? e.message
          : 'Não foi possível descartar. Feche as outras abas do Arretado e tente de novo.';
      if (depois === 'colar') setFalha(mensagem);
      else setFalhaDescarte(mensagem);
    });
  }

  const cabecalho = (
    <h1 ref={titulo1} tabIndex={-1}>
      Importar norma
    </h1>
  );
  const voltar = (
    <Link to="/biblioteca" className="botao discreto">
      Voltar à Biblioteca
    </Link>
  );
  const avisoFalha = falha && (
    <p role="alert" className="aviso falha">
      {falha}
    </p>
  );

  switch (fase.tipo) {
    case 'colar':
      return (
        <>
          {cabecalho}
          <p>
            Na página da lei (Planalto ou ALESP), selecione tudo (Ctrl+A), copie (Ctrl+C) e cole
            aqui (Ctrl+V). No celular, toque e segure no campo e escolha Colar.
          </p>
          <form onSubmit={(e) => void buscar(e)}>
            <div className="campo">
              <label htmlFor="importar-endereco">Ou busque pelo endereço da página</label>
              <input
                id="importar-endereco"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://www.planalto.gov.br/…"
                aria-describedby="importar-endereco-dica"
                value={endereco}
                onChange={(e) => {
                  setEndereco(e.target.value);
                }}
              />
              <p id="importar-endereco-dica" className="dica">
                Só Planalto e ALESP, e precisa de internet. Se não der certo, cole a lei abaixo.
              </p>
            </div>
            <button type="submit" disabled={buscando || endereco.trim() === ''}>
              {buscando ? 'Buscando…' : 'Buscar'}
            </button>
          </form>
          <div className="campo">
            <label htmlFor="importar-colar">Cole aqui a lei</label>
            <textarea
              id="importar-colar"
              rows={6}
              value={digitado}
              aria-describedby="importar-colar-dica"
              onPaste={aoColar}
              onChange={(e) => {
                setDigitado(e.target.value);
              }}
            />
            <p id="importar-colar-dica" className="dica">
              Fica só o texto, sem a formatação da página. Você confere o resultado antes de
              publicar.
            </p>
          </div>
          {avisoFalha}
          <div className="linha-acoes">
            {digitado.trim() !== '' && (
              <button
                type="button"
                className="principal"
                onClick={() => void importar('', digitado)}
              >
                Importar o texto
              </button>
            )}
            {voltar}
          </div>
          <section aria-labelledby="importar-escrever">
            <h2 id="importar-escrever">Escrever do zero</h2>
            <p className="dica">
              Para súmula, enunciado ou norma pequena: comece de um artigo vazio e escreva o texto.
            </p>
            <form onSubmit={(e) => void escrever(e)}>
              <div className="campo">
                <label htmlFor="importar-escrever-titulo">Título curto</label>
                <input
                  id="importar-escrever-titulo"
                  type="text"
                  required
                  maxLength={500}
                  autoComplete="off"
                  value={tituloNovo}
                  onChange={(e) => {
                    setTituloNovo(e.target.value);
                  }}
                />
              </div>
              <div className="linha-acoes">
                <button type="submit" disabled={tituloNovo.trim() === ''}>
                  Começar a escrever
                </button>
              </div>
            </form>
          </section>
        </>
      );

    case 'processando':
      return (
        <>
          {cabecalho}
          <div role="status" className="andamento">
            <p>
              {fase.etapa}…{fase.passos > 1 && ` (${String(fase.passo)} de ${String(fase.passos)})`}
            </p>
            <progress
              aria-label="Andamento da importação"
              max={fase.passos + 1}
              value={fase.passo}
            />
          </div>
        </>
      );

    case 'repetida': {
      const publicada = fase.versao.status !== 'rascunho';
      return (
        <>
          {cabecalho}
          <div role="status" className="aviso">
            <p>
              <strong>
                {publicada
                  ? `${fase.norma.tituloCurto} já está na Biblioteca, com este mesmo texto.`
                  : `Este texto já foi colado: a importação de ${fase.norma.tituloCurto} está pendente de revisão.`}
              </strong>
            </p>
          </div>
          <div className="linha-acoes">
            {publicada ? (
              <>
                {fase.versao.status === 'vigente' && (
                  <Link to={`/biblioteca/normas/${fase.norma.id}`} className="botao principal">
                    Ler a norma
                  </Link>
                )}
                <Link
                  to="/biblioteca"
                  className={fase.versao.status === 'vigente' ? 'botao' : 'botao principal'}
                >
                  Ver na Biblioteca
                </Link>
              </>
            ) : (
              <button
                type="button"
                className="principal"
                onClick={() => {
                  retomar(fase.versao);
                }}
              >
                Retomar a importação
              </button>
            )}
            <button type="button" onClick={colarOutra}>
              Colar outra norma
            </button>
          </div>
        </>
      );
    }

    case 'indisponivel':
      return (
        <>
          {cabecalho}
          <div role="alert" className="aviso falha">
            <p>
              <strong>{fase.mensagem}</strong>
            </p>
          </div>
          <div className="linha-acoes">
            <Link to="/biblioteca" className="botao principal">
              Voltar à Biblioteca
            </Link>
            <button type="button" onClick={colarOutra}>
              Colar uma norma
            </button>
          </div>
        </>
      );

    case 'sumario': {
      const importacao = fase.importacao;
      const { norma, relatorio, sumario } = importacao;
      const contexto = [norma.epigrafe, norma.ementa].filter((p) => p !== undefined).join(' — ');

      if (relatorio.conflitos.some((c) => c.tipo === 'sem_artigos')) {
        return (
          <>
            {cabecalho}
            <div role="alert" className="aviso falha">
              <p>
                <strong>Não consegui identificar artigos neste texto.</strong>
              </p>
              <p>
                Confira se copiou a página inteira da lei, com os artigos (&quot;Art. 1º&quot;…), e
                cole de novo.
              </p>
            </div>
            {avisoFalha}
            <div className="linha-acoes">
              <button
                type="button"
                className="principal"
                disabled={ocupado}
                onClick={() => {
                  descartar(importacao, 'colar');
                }}
              >
                Colar novamente da página
              </button>
              <Link to="/biblioteca" className="botao">
                Guardar para editar depois
              </Link>
            </div>
            <EdicaoIntegral
              versaoId={importacao.versao.id}
              revisao={mudancas}
              aoMudar={() => depoisDoTextoInteiro(importacao)}
              aoIndisponivel={(mensagem) => {
                setFase({ tipo: 'indisponivel', mensagem });
              }}
            />
            <p className="dica">
              Guardado, o rascunho fica em Importações pendentes, na Biblioteca.
            </p>
          </>
        );
      }

      const avisos = avisosDe(importacao);
      const bloqueada = relatorio.conflitos.length > 0;
      const semTitulo = titulo.trim() === '';
      return (
        <>
          {cabecalho}
          {contexto && <p className="dica">{contexto}</p>}
          {bloqueada && (
            <div role="alert" className="aviso falha">
              <p>
                <strong>Ainda não dá para publicar:</strong>
              </p>
              <ul>
                {relatorio.conflitos.map((c, k) => (
                  <li key={k}>{c.mensagem}</li>
                ))}
              </ul>
            </div>
          )}
          <section aria-labelledby="importar-estrutura">
            <h2 id="importar-estrutura">Estrutura encontrada</h2>
            <dl className="contagens">
              {sumario.porTipo.map(({ tipo, quantidade }) => (
                <div key={tipo}>
                  <dt>{rotuloTipo(tipo, quantidade)}</dt>
                  <dd>{quantidade.toLocaleString('pt-BR')}</dd>
                </div>
              ))}
            </dl>
            <p className="dica">
              {plural(relatorio.totalDispositivos, 'dispositivo', 'dispositivos')} no total
              {sumario.redacoesAnteriores > 0 &&
                `, com ${plural(sumario.redacoesAnteriores, 'redação anterior', 'redações anteriores')} (${sumario.redacoesAnteriores === 1 ? 'oculta' : 'ocultas'} na leitura)`}
              .
            </p>
          </section>
          {avisos.length > 0 && (
            <section aria-labelledby="importar-avisos">
              <h2 id="importar-avisos">Avisos</h2>
              <ul>
                {avisos.slice(0, MAX_AVISOS).map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              {avisos.length > MAX_AVISOS && (
                <p className="dica">
                  E mais {plural(avisos.length - MAX_AVISOS, 'aviso', 'avisos')}.
                </p>
              )}
            </section>
          )}
          {sumario.descartes.length > 0 && (
            <section aria-labelledby="importar-descartes">
              <h2 id="importar-descartes">Ficou de fora</h2>
              <ul>
                {sumario.descartes.map((d) => (
                  <li key={d.motivo}>{fraseDescarte(d.motivo, d.linhas)}</li>
                ))}
              </ul>
            </section>
          )}
          <RevisaoDoRascunho
            key={geracao}
            versaoId={importacao.versao.id}
            aConfirmar={relatorio.aConfirmar}
            aoMudar={() => atualizarRelatorio(importacao)}
            aoIndisponivel={(mensagem) => {
              setFase({ tipo: 'indisponivel', mensagem });
            }}
          />
          <EdicaoIntegral
            versaoId={importacao.versao.id}
            revisao={mudancas}
            abrirAoMontar={fase.escrever === true}
            aoMudar={() => depoisDoTextoInteiro(importacao)}
            aoIndisponivel={(mensagem) => {
              setFase({ tipo: 'indisponivel', mensagem });
            }}
          />
          <form onSubmit={(e) => void publicar(e, importacao)}>
            <div className="campo">
              <label htmlFor="importar-titulo">Título curto</label>
              <input
                id="importar-titulo"
                type="text"
                required
                maxLength={500}
                autoComplete="off"
                aria-describedby="importar-titulo-dica"
                value={titulo}
                onChange={(e) => {
                  setTitulo(e.target.value);
                }}
              />
              <p id="importar-titulo-dica" className="dica">
                Como a norma aparece na Biblioteca (ex.: LEP, ECA). Sugerido pela epígrafe.
              </p>
            </div>
            {avisoFalha}
            <div className="linha-acoes">
              <button
                type="submit"
                className="principal"
                disabled={ocupado || bloqueada || semTitulo}
              >
                {ocupado
                  ? 'Publicando…'
                  : relatorio.aConfirmar > 0
                    ? `Aceitar ${relatorio.aConfirmar.toLocaleString('pt-BR')} e publicar`
                    : 'Publicar'}
              </button>
              <button
                type="button"
                disabled={ocupado}
                onClick={() => {
                  setFalhaDescarte(null);
                  setDescartando(true);
                }}
              >
                Descartar rascunho
              </button>
            </div>
            {semTitulo && <p className="dica">Para publicar: dê um título curto.</p>}
          </form>
          <Dialogo
            aberto={descartando}
            aoFechar={() => {
              setDescartando(false);
            }}
            titulo={`Descartar a importação de ${norma.tituloCurto}?`}
          >
            <p>
              A norma importada e a página guardada saem deste aparelho. Para lê-la, será preciso
              importá-la de novo.
            </p>
            {falhaDescarte && (
              <p role="alert" className="aviso falha">
                {falhaDescarte}
              </p>
            )}
            <div className="linha-acoes">
              <button
                type="button"
                className="perigoso"
                disabled={ocupado}
                onClick={() => {
                  descartar(importacao, 'biblioteca');
                }}
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={() => {
                  setDescartando(false);
                }}
              >
                Cancelar
              </button>
            </div>
          </Dialogo>
        </>
      );
    }
  }
}
