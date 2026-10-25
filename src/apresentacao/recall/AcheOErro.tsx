// Ache o erro (AP-06, piloto de duas semanas): uma rodada de dispositivos do texto vigente; em três
// de cada quatro, um trecho foi trocado. A pessoa toca no trecho (ou diz que a frase está certa, ou
// que não sabe), diz quanta certeza tem, e vê o texto certo na hora, com a troca riscada. Quem erra
// ganha um Erro com a Frase correta (`registrarErro`); a frase falsa nunca vira Frase nem Cartão. A
// medição fica no aparelho (localStorage) e nada sai dele. Carregada por `import()` (App.tsx).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  compararComLacuna,
  conferir,
  montarRodada,
  oQueFoi,
  tipoDoItem,
  type ItemDoAcheOErro,
  type RespostaDoItem,
} from '../../dominios/legislacao/ache-o-erro';
import {
  anotar,
  DIAS_ATE_REVISITA,
  DIAS_DO_PILOTO,
  fracao,
  lerMedicao,
  paraRevisitar,
  resumo,
  type Contagem,
  type Medicao,
  type ResumoDaMedicao,
  type TipoMedido,
} from '../../dominios/legislacao/medicao-ache-o-erro';
import { criarFraseDeTrecho, registrarErro } from '../../dominios/recall/servico';
import { referenciaDoNo } from '../biblioteca/linhas';
import { Esqueleto, Falha, Vazio } from '../componentes/estados';
import { LinhaDepois } from '../componentes/LinhaDepois';
import { useRepositorio } from '../dados/contexto';
import { gravarJson, lerJson } from '../plano/armazenamento';
import { TopoDaRevisao } from './TopoDaRevisao';
import './estilos-certeza.css';
import './estilos-ache-o-erro.css';

const CHAVE_DA_MEDICAO = 'arretado.ache-o-erro.medicao';

const CERTEZAS = [
  [1, 'Chutando'],
  [2, 'Acho que sei'],
  [3, 'Tenho certeza'],
] as const;

const NOME_DO_TIPO: Record<TipoMedido, string> = {
  numero: 'Números',
  prazo: 'Prazos',
  quantificador: 'Quantificadores',
  absoluto: 'Termos absolutos',
  pena: 'Penas e quóruns',
  sem_troca: 'Sem troca',
};

type Certeza = 1 | 2 | 3;

interface Rodada {
  itens: ItemDoAcheOErro[];
  indice: number;
  acertos: number;
}

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'vazio' }
  | { tipo: 'falha' }
  | {
      tipo: 'perguntando';
      rodada: Rodada;
      selecao: { inicio: number; fim: number } | null;
      certeza: Certeza | undefined;
    }
  | {
      tipo: 'conferido';
      rodada: Rodada;
      resposta: RespostaDoItem;
      acertou: boolean;
      certeza: Certeza | undefined;
      /** O Erro (e a Frase correta) já gravados, ou a Frase guardada a pedido. */
      guardada: 'erro' | 'frase' | 'guardando' | null;
    }
  | {
      tipo: 'fim';
      rodada: Rodada;
      medida: ResumoDaMedicao;
      lacuna: Contagem;
    };

function lerMedicaoDoAparelho(agora: Date): Medicao {
  return lerMedicao(lerJson(CHAVE_DA_MEDICAO), agora);
}

/** O texto com os trechos tocáveis; `selecao` é o tocado. */
function TextoParaTocar({
  item,
  selecao,
  aoTocar,
}: {
  item: ItemDoAcheOErro;
  selecao: { inicio: number; fim: number } | null;
  aoTocar: (c: { inicio: number; fim: number }) => void;
}) {
  const pedacos = [];
  let cursor = 0;
  for (const c of item.candidatos) {
    if (c.inicio > cursor) pedacos.push(item.mostrado.slice(cursor, c.inicio));
    const ativo = selecao?.inicio === c.inicio;
    pedacos.push(
      <button
        key={c.inicio}
        type="button"
        className="trecho-candidato"
        aria-pressed={ativo}
        onClick={() => {
          aoTocar(c);
        }}
      >
        {item.mostrado.slice(c.inicio, c.fim)}
      </button>,
    );
    cursor = c.fim;
  }
  if (cursor < item.mostrado.length) pedacos.push(item.mostrado.slice(cursor));
  return <p className="ache-texto texto-leitura">{pedacos}</p>;
}

/** O texto certo, com a troca riscada e o que vale no lugar. */
function TextoCerto({ item }: { item: ItemDoAcheOErro }) {
  const t = item.troca;
  if (!t) return <p className="ache-texto texto-leitura">{item.texto}</p>;
  return (
    <p className="ache-texto texto-leitura">
      {item.texto.slice(0, t.inicio)}
      <del className="ache-del">{t.substituto}</del> <ins className="ache-ins">{t.original}</ins>
      {item.texto.slice(t.fim)}
    </p>
  );
}

const NOME_DA_CERTEZA: Record<Certeza, string> = {
  1: 'Você estava chutando',
  2: 'Você achava que sabia',
  3: 'Você tinha certeza',
};

function fraseDoResultado(
  acertou: boolean,
  resposta: RespostaDoItem,
  certeza: Certeza | undefined,
  item: ItemDoAcheOErro,
): string {
  if (resposta.tipo === 'nao_sei') return 'Sem problema. Este é o texto certo.';
  const quem = certeza ? NOME_DA_CERTEZA[certeza] : 'Você';
  if (acertou) {
    const oQue = item.troca ? 'achou a troca' : 'viu que estava certa como está';
    return `${quem} e ${oQue}. O Ache o erro volta a este trecho em ${String(DIAS_ATE_REVISITA)} dias.`;
  }
  return `${quem} e não era isso. A Frase correta foi para as suas Frases e volta amanhã.`;
}

export function AcheOErro() {
  const repo = useRepositorio();
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const [falha, setFalha] = useState<string | null>(null);
  const medicao = useRef<Medicao | null>(null);

  const agora = useCallback(() => repo.ctx.agora(), [repo]);

  const iniciarRodada = useCallback(
    (ativo: () => boolean = () => true) => {
      medicao.current ??= lerMedicaoDoAparelho(agora());
      montarRodada(repo, paraRevisitar(medicao.current, agora()), (aberta, indice) =>
        referenciaDoNo(aberta.nos, aberta.indiceDe, indice),
      ).then(
        (itens) => {
          if (!ativo()) return;
          if (itens.length === 0) setEstado({ tipo: 'vazio' });
          else {
            setEstado({
              tipo: 'perguntando',
              rodada: { itens, indice: 0, acertos: 0 },
              selecao: null,
              certeza: undefined,
            });
          }
        },
        () => {
          if (ativo()) setEstado({ tipo: 'falha' });
        },
      );
    },
    [repo, agora],
  );

  useEffect(() => {
    let ativo = true;
    iniciarRodada(() => ativo);
    return () => {
      ativo = false;
    };
  }, [iniciarRodada]);

  const responder = useCallback(
    async (resposta: RespostaDoItem) => {
      if (estado.tipo !== 'perguntando') return;
      const { rodada, certeza } = estado;
      const item = rodada.itens[rodada.indice];
      if (!item) return;
      const acertou = conferir(item, resposta);
      const em = agora();
      medicao.current = anotar(medicao.current ?? lerMedicaoDoAparelho(em), {
        em: em.toISOString(),
        dispositivoId: item.dispositivoId,
        tipo: tipoDoItem(item),
        resposta: resposta.tipo,
        acertou,
        ...(certeza ? { certeza } : {}),
        revisita: item.revisita,
      });
      gravarJson(CHAVE_DA_MEDICAO, medicao.current);
      const proxima: Rodada = { ...rodada, acertos: rodada.acertos + (acertou ? 1 : 0) };
      // Errou de verdade (não é "não sei"): o Erro leva a Frase correta, nunca a frase falsa.
      const gravaErro = !acertou && resposta.tipo !== 'nao_sei';
      setEstado({
        tipo: 'conferido',
        rodada: proxima,
        resposta,
        acertou,
        certeza,
        guardada: gravaErro ? 'guardando' : null,
      });
      if (!gravaErro) return;
      try {
        await registrarErro(repo, {
          fraseCorreta: item.texto,
          oQueFoi: oQueFoi(item, resposta),
          causa: 'literalidade',
          dispositivoId: item.dispositivoId,
          ...(certeza ? { conviccao: certeza } : {}),
        });
        setEstado((e) => (e.tipo === 'conferido' ? { ...e, guardada: 'erro' } : e));
      } catch {
        setEstado((e) => (e.tipo === 'conferido' ? { ...e, guardada: null } : e));
        setFalha('Não foi possível gravar o Erro. A rodada segue; nada mais foi alterado.');
      }
    },
    [estado, repo, agora],
  );

  const guardarFrase = useCallback(
    async (item: ItemDoAcheOErro) => {
      setEstado((e) => (e.tipo === 'conferido' ? { ...e, guardada: 'guardando' } : e));
      try {
        await criarFraseDeTrecho(repo, {
          texto: item.texto,
          trecho: {
            dispositivoId: item.dispositivoId,
            versaoId: item.versaoId,
            texto: item.texto,
            inicio: item.deslocamento,
            fim: item.deslocamento + item.texto.length,
          },
        });
        setEstado((e) => (e.tipo === 'conferido' ? { ...e, guardada: 'frase' } : e));
      } catch {
        setEstado((e) => (e.tipo === 'conferido' ? { ...e, guardada: null } : e));
        setFalha('Não foi possível guardar a Frase. Nada foi alterado.');
      }
    },
    [repo],
  );

  const avancar = useCallback(async () => {
    if (estado.tipo !== 'conferido') return;
    setFalha(null);
    const { rodada } = estado;
    if (rodada.indice + 1 < rodada.itens.length) {
      setEstado({
        tipo: 'perguntando',
        rodada: { ...rodada, indice: rodada.indice + 1 },
        selecao: null,
        certeza: undefined,
      });
      return;
    }
    const m = medicao.current ?? lerMedicaoDoAparelho(agora());
    const lacuna = await compararComLacuna(
      repo,
      [...new Set(m.registros.map((r) => r.dispositivoId))],
      m.inicio,
    ).catch(() => ({ total: 0, acertos: 0 }));
    setEstado({ tipo: 'fim', rodada, medida: resumo(m, agora()), lacuna });
  }, [estado, repo, agora]);

  if (estado.tipo === 'carregando') return <Esqueleto linhas={5} />;
  if (estado.tipo === 'falha') {
    return (
      <Falha oQue="Não foi possível montar a rodada." oQueFazer="Volte ao Fixar e tente de novo." />
    );
  }
  if (estado.tipo === 'vazio') {
    return (
      <Vazio
        titulo="Ache o erro precisa de uma Norma"
        acao={
          <Link to="/biblioteca" className="botao principal">
            Abrir a Biblioteca
          </Link>
        }
      >
        <p>
          As trocas vêm do texto vigente das normas publicadas na sua Biblioteca. Importe uma (o ECA
          ou o Código Penal, por exemplo) e volte aqui.
        </p>
      </Vazio>
    );
  }
  if (estado.tipo === 'fim') {
    const { rodada, lacuna, medida: r } = estado;
    return (
      <div className="coluna-drill">
        <h1>Ache o erro</h1>
        <p className="texto-leitura">
          Rodada feita: {rodada.acertos} de {rodada.itens.length}.
        </p>
        <div className="linha-acoes acoes-drill">
          <button
            type="button"
            className="principal grande"
            onClick={() => {
              setEstado({ tipo: 'carregando' });
              iniciarRodada();
            }}
          >
            Outra rodada
          </button>
          <Link to="/recall" className="botao">
            Voltar ao Fixar
          </Link>
        </div>
        <details className="ache-piloto">
          <summary className="botao botao-texto na-margem">
            Como vai o piloto (dia {r.dia} de {DIAS_DO_PILOTO})
          </summary>
          <p className="dica">
            Tudo fica neste aparelho. Ao fim das duas semanas, a medida diz se treinar com trocas
            rende mais que a lacuna.
          </p>
          <dl>
            {(Object.entries(r.porTipo) as [TipoMedido, Contagem][]).map(([t, c]) => (
              <ElementoDaMedida key={t} nome={NOME_DO_TIPO[t]} valor={fracao(c)} />
            ))}
            <ElementoDaMedida nome="Primeira vez" valor={fracao(r.primeiras)} />
            <ElementoDaMedida
              nome={`Revisita aos ${String(DIAS_ATE_REVISITA)} dias`}
              valor={fracao(r.revisitas)}
            />
            <ElementoDaMedida nome="Cartões de lacuna dos mesmos trechos" valor={fracao(lacuna)} />
          </dl>
        </details>
      </div>
    );
  }

  const { rodada } = estado;
  const item = rodada.itens[rodada.indice];
  if (!item) return <Falha oQue="A rodada se perdeu." oQueFazer="Volte ao Fixar e abra de novo." />;
  const restam = rodada.itens.length - rodada.indice - 1;
  return (
    <div className="coluna-drill">
      <h1 className="visualmente-oculto">Ache o erro</h1>
      <TopoDaRevisao
        sair="/recall"
        valor={rodada.indice + 1}
        max={rodada.itens.length}
        rotulo="Frase"
      />
      <article className="cartao-bloco ache-folha" aria-label="Frase">
        <p className="ache-referencia">
          {item.referencia}
          {item.revisita ? ' · revisita' : ''}
        </p>
        {estado.tipo === 'perguntando' ? (
          <>
            <p className="ache-instrucao">
              Uma parte desta frase pode ter sido trocada. Toque nela.
            </p>
            <TextoParaTocar
              item={item}
              selecao={estado.selecao}
              aoTocar={(c) => {
                setEstado({
                  ...estado,
                  selecao: estado.selecao?.inicio === c.inicio ? null : c,
                });
              }}
            />
          </>
        ) : (
          <div aria-live="polite">
            <TextoCerto item={item} />
            {item.troca === undefined && <p className="ache-instrucao">Estava certa como está.</p>}
          </div>
        )}
      </article>
      {falha && (
        <p role="alert" className="aviso falha">
          {falha}
        </p>
      )}
      {estado.tipo === 'perguntando' ? (
        <div className="linha-acoes acoes-drill ache-respostas">
          <div className="certeza" role="group" aria-labelledby="certeza-rotulo">
            <p id="certeza-rotulo" className="certeza-rotulo">
              Quanta certeza?
            </p>
            <div className="certeza-opcoes">
              {CERTEZAS.map(([valor, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  className={estado.certeza === valor ? 'chip principal' : 'chip'}
                  aria-pressed={estado.certeza === valor}
                  onClick={() => {
                    setEstado({
                      ...estado,
                      certeza: estado.certeza === valor ? undefined : valor,
                    });
                  }}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="principal grande"
            disabled={estado.selecao === null}
            onClick={() => {
              if (estado.selecao) void responder({ tipo: 'tocou', ...estado.selecao });
            }}
          >
            Conferir
          </button>
          <div className="ache-outras">
            <button
              type="button"
              className="botao-texto"
              onClick={() => void responder({ tipo: 'certa' })}
            >
              Está certa como está
            </button>
            <button
              type="button"
              className="botao-texto"
              onClick={() => void responder({ tipo: 'nao_sei' })}
            >
              Não sei
            </button>
          </div>
        </div>
      ) : (
        <div className="linha-acoes acoes-drill ache-respostas">
          <p className="ache-instrucao" role="status">
            {fraseDoResultado(estado.acertou, estado.resposta, estado.certeza, item)}
          </p>
          <button type="button" className="principal grande" onClick={() => void avancar()}>
            {restam > 0 ? 'Próxima' : 'Terminar a rodada'}
          </button>
          {estado.guardada === 'frase' ? (
            <p className="dica">Frase correta guardada nas suas Frases.</p>
          ) : estado.guardada === null ? (
            <button type="button" className="botao-texto" onClick={() => void guardarFrase(item)}>
              Guardar a Frase correta
            </button>
          ) : null}
        </div>
      )}
      <LinhaDepois>
        {restam > 0
          ? `${restam === 1 ? 'mais 1 frase' : `mais ${String(restam)} frases`} nesta rodada`
          : 'o fim desta rodada'}
      </LinhaDepois>
    </div>
  );
}

function ElementoDaMedida({ nome, valor }: { nome: string; valor: string }) {
  return (
    <>
      <dt>{nome}</dt>
      <dd>{valor}</dd>
    </>
  );
}
