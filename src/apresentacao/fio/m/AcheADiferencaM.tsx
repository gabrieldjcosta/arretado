import { Fragment, useState } from 'react';
import { diferencaDePalavras, type Pedaco } from '../../../dominios/legislacao/pares';
import { fonteDoNo } from '../../../dominios/legislacao/ache-o-erro';
import { abrirNorma } from '../../../dominios/legislacao/leitor';
import { referenciaDe, useCargaDoPasso } from '../passos/carregar';
import { animar, modoAgora, MOLA } from './anima';
import { BotaoPular, BotaoSeguir, PassoSemNada } from './BotoesM';
import { CartaoM } from './CartaoM';
import type { PropsDoPassoM, Variante } from './passo-tipos';
import { avisar } from './toast';

type Lado = 'a' | 'b';

interface Par {
  a: { rotulo: string; pedacos: Pedaco[] };
  b: { rotulo: string; pedacos: Pedaco[] };
}

/** Quantas diferenças o par tem: uma por pedaço que só existe de um lado. */
const quantasDiferencas = (p: Par) =>
  [...p.a.pedacos, ...p.b.pedacos].filter((x) => x.difere).length;

/** Cada palavra com o espaço que vem depois, para tocar numa só (o texto volta inteiro ao juntar). */
function palavras(texto: string): string[] {
  return texto.match(/\S+\s*|\s+/g) ?? [];
}

/**
 * O passo "Ache a diferença": dois artigos parecidos, um sobre o outro (lado a lado em tela larga), e a
 * pessoa toca nas palavras que os separam. Tocar numa palavra igual nos dois não custa nada; "Mostrar a
 * diferença" grifa o que faltou. Peças do cartão "Ache o erro" do mockup (`data-cartao="achar"`): a palavra
 * que se toca, o grifo que chega na mola, o retorno e o rodapé que entra depois (desvio 47).
 */
export function AcheADiferencaM({
  passo,
  semente,
  trilho,
  aoConcluir,
  aoPular,
  aoPausar,
}: PropsDoPassoM<Variante<'ache_a_diferenca'>>) {
  const chave = `diferenca|${passo.normaId}|${passo.a.endereco}|${passo.b.endereco}|${String(semente)}`;
  const carga = useCargaDoPasso(chave, async (repo): Promise<Par | undefined> => {
    const aberta = await abrirNorma(repo, passo.normaId);
    const texto = async (endereco: string) => {
      const indice = aberta.nos.findIndex((no) => no.dispositivo.endereco === endereco);
      if (indice < 0) return undefined;
      return (await fonteDoNo(repo, aberta, indice, referenciaDe))?.texto;
    };
    const [ta, tb] = await Promise.all([texto(passo.a.endereco), texto(passo.b.endereco)]);
    if (ta === undefined || tb === undefined) return undefined;
    const d = diferencaDePalavras(ta, tb);
    const par: Par = {
      a: { rotulo: passo.a.rotulo, pedacos: d.a },
      b: { rotulo: passo.b.rotulo, pedacos: d.b },
    };
    return quantasDiferencas(par) > 0 ? par : undefined;
  });
  const [achadas, setAchadas] = useState<ReadonlySet<string>>(new Set());
  const [tentou, setTentou] = useState<ReadonlySet<string>>(new Set());
  const [revelado, setRevelado] = useState(false);
  const par = carga.estado === 'pronto' ? carga.dados : undefined;
  const vazio = carga.estado === 'falhou' || (carga.estado === 'pronto' && par === undefined);
  const total = par ? quantasDiferencas(par) : 0;
  const resolvido = revelado || (total > 0 && achadas.size >= total);

  const tocar = (alvo: HTMLElement, chaveDaPalavra: string, difere: boolean) => {
    if (resolvido) return;
    if (difere) {
      setAchadas((s) => new Set(s).add(chaveDaPalavra));
      // O grifo chega na mola (o `troca` do mockup).
      if (modoAgora() !== 'reduzido') {
        void animar(
          alvo,
          [
            { transform: 'scale(.82)', opacity: 0.4 },
            { transform: 'scale(1)', opacity: 1 },
          ],
          { duration: 420, easing: MOLA },
        );
      }
      return;
    }
    // Palavra igual nos dois: sem punição, só um balanço e um aviso na primeira vez.
    if (modoAgora() !== 'reduzido') {
      void animar(
        alvo,
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-3px)' },
          { transform: 'translateX(3px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 220 },
      );
    }
    if (tentou.size === 0) avisar('Essa está igual nos dois. Procure de novo.');
    setTentou((s) => new Set(s).add(chaveDaPalavra));
  };

  const lado = (l: Lado, dados: Par[Lado]) => (
    <div className="m-lei m-lado-da-diferenca" data-lado={l}>
      <p>
        <span className="m-art">{dados.rotulo}.</span>{' '}
        {dados.pedacos.map((p, i) => {
          const k = `${l}:${String(i)}`;
          if (p.difere) {
            const achada = achadas.has(k);
            const tocarEsta = (alvo: HTMLElement) => {
              tocar(alvo, k, true);
            };
            // Trecho em linha (`span`, e não `button`): o que difere pode ter várias palavras e tem de quebrar de
            // linha como o texto da lei. Cada um se alcança pelo teclado; as palavras iguais só se tocam.
            return (
              <Fragment key={k}>
                <span
                  role="button"
                  tabIndex={0}
                  aria-pressed={achada || revelado}
                  className={[
                    'm-palavra',
                    'm-diverge',
                    (achada || revelado) && 'm-achada',
                    revelado && !achada && 'm-mostrada',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={(e) => {
                    tocarEsta(e.currentTarget);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    tocarEsta(e.currentTarget);
                  }}
                >
                  {p.texto.trimEnd()}
                </span>
                {p.texto.slice(p.texto.trimEnd().length)}
              </Fragment>
            );
          }
          return palavras(p.texto).map((w, j) => {
            const kw = `${k}:${String(j)}`;
            if (w.trim() === '') return <Fragment key={kw}>{w}</Fragment>;
            return (
              <Fragment key={kw}>
                <span
                  className={['m-palavra', tentou.has(kw) && 'm-tentou'].filter(Boolean).join(' ')}
                  onClick={(e) => {
                    tocar(e.currentTarget, kw, false);
                  }}
                >
                  {w.trimEnd()}
                </span>
                {w.slice(w.trimEnd().length)}
              </Fragment>
            );
          });
        })}
      </p>
    </div>
  );

  return (
    <CartaoM
      nome="diferenca"
      etiqueta="Ache a diferença"
      carimbo="ACHEI"
      resolvido={resolvido}
      aoSeguir={() => {
        aoConcluir({ tipo: 'ache_a_diferenca', achadas: achadas.size, total });
      }}
      aoPular={aoPular}
      aoPausar={aoPausar}
      trilho={trilho}
    >
      {vazio && <PassoSemNada texto="Não deu para pôr estes dois artigos lado a lado." />}
      {carga.estado === 'carregando' && <p className="m-quieto">…</p>}
      {par && (
        <>
          <h2 style={{ margin: '4px 0 4px' }}>Os dois se parecem. O que muda?</h2>
          <p className="m-porque">
            <span className="m-ponto-azul" />É assim que a FCC cobra: um artigo no lugar do outro.
            Toque nas palavras que só um deles tem.
          </p>
          <div className="m-lados-da-diferenca">
            {lado('a', par.a)}
            {lado('b', par.b)}
          </div>
          <div className="m-retorno" aria-live="polite">
            {resolvido &&
              (revelado && achadas.size < total ? (
                <p className="m-ok">
                  {achadas.size > 0
                    ? `Você achou ${String(achadas.size)} de ${String(total)}. As outras ficaram grifadas.`
                    : 'A diferença está grifada.'}
                </p>
              ) : (
                <p className="m-ok">
                  {total === 1 ? 'Achou. Era só essa.' : `Achou as ${String(total)}.`}
                </p>
              ))}
          </div>
          <div className="m-vazio" />
          <div className="m-rodape-cartao">
            {resolvido ? (
              <BotaoSeguir>Seguir</BotaoSeguir>
            ) : (
              <>
                <BotaoPular />
                <button
                  type="button"
                  className="m-chip"
                  onClick={() => {
                    setRevelado(true);
                  }}
                >
                  Mostrar a diferença
                </button>
              </>
            )}
          </div>
        </>
      )}
    </CartaoM>
  );
}
