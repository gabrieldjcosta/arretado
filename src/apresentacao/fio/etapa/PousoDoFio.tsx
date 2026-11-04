import { useLayoutEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router';
import type { Pouso } from '../../../dominios/fio';
import { Esqueleto } from '../../componentes/estados';
import { FioQueSePuxa } from '../agora/FioQueSePuxa';
import { marcarPausa } from '../dados/pausa';
import { useFio, type FioNaTela } from '../dados/useFio';
import { CenaDoPouso } from './cena/CenaDoPouso';
import { pousoNaVereda, pousosDaVolta, type PousoNaVereda } from './cena/lugares';
import './fio-etapa.css';
import './fio-pouso.css';

/** Onde ficam as cinco pétalas de cada florzinha das pílulas (cinco pétalas em volta do miolo, em 12 por 12). */
const PETALAS = [
  [6, 2.6],
  [9.2, 4.9],
  [8, 9],
  [4, 9],
  [2.8, 4.9],
] as const;

/** Uma florzinha por flor que o cacto tem naquele pouso. Só enfeite: o nome da pílula já diz quantas são. */
function FloresDaPilula({ quantas }: { quantas: number }) {
  return (
    <span className="fio-pouso-flores" aria-hidden="true">
      {Array.from({ length: quantas }, (_, i) => (
        <svg key={i} viewBox="0 0 12 12" focusable="false">
          {PETALAS.map(([cx, cy]) => (
            <circle key={cx} className="fio-pouso-petala" cx={cx} cy={cy} r="2.1" />
          ))}
          <circle className="fio-pouso-miolo" cx="6" cy="6" r="1.4" />
        </svg>
      ))}
    </span>
  );
}

/**
 * Os fatos do pouso que a tela mostra: os de agora, ou os de um pouso anterior da volta (o aparelho guarda os
 * últimos dez). Sem registro de um pouso antigo, a tela não inventa nada: `undefined`.
 */
function fatosDoPousoVisto(
  visto: PousoNaVereda,
  agora: Pouso,
  guardados: readonly Pouso[],
): readonly string[] | undefined {
  if (visto.numero === agora.etapa + 1) return agora.fatos;
  return guardados.find((p) => p.etapa + 1 === visto.numero)?.fatos;
}

/**
 * A cena e o que a acompanha. As pílulas só mostram o que a pessoa já visitou na volta; tocar numa troca a
 * cena, o título e os fatos para os daquele pouso, sem mexer em nada guardado.
 */
function PousoEmCena({ pouso, fio }: { pouso: Pouso; fio: FioNaTela }) {
  const numero = pouso.etapa + 1;
  const [escolhido, setEscolhido] = useState(numero);
  const faixa = useRef<HTMLDivElement>(null);
  // As pílulas rolam de lado em tela estreita: a da vez, a última, já abre à vista.
  useLayoutEffect(() => {
    const atual = faixa.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (faixa.current && atual) faixa.current.scrollLeft = Math.max(0, atual.offsetLeft - 8);
  }, []);
  const volta = pousosDaVolta(numero);
  const visto = volta.find((p) => p.numero === escolhido) ?? pousoNaVereda(numero);
  const fatos = fatosDoPousoVisto(visto, pouso, fio.fio.estado.pousos);

  return (
    <section className="fio-etapa fio-pouso" aria-labelledby="fio-pouso-titulo">
      <div className="fio-pouso-ceu">
        <span className="fio-olho">
          Pouso {String(visto.numero)} · {visto.lugar.nome}
        </span>
        <CenaDoPouso key={visto.numero} pouso={visto} />
      </div>
      <h1 className="fio-titulo fio-pouso-titulo" id="fio-pouso-titulo" aria-live="polite">
        {visto.lugar.titulo}
      </h1>
      {fatos !== undefined &&
        (fatos.length > 0 ? (
          <ul className="fio-fatos">
            {fatos.map((fato) => (
              <li key={fato}>{fato}</li>
            ))}
          </ul>
        ) : (
          <p className="fio-quieto">Você deu esse passo. Amanhã tem mais.</p>
        ))}
      <div className="fio-pouso-lugares" role="group" aria-label="Pousos da vereda" ref={faixa}>
        {volta.map((p) => (
          <button
            key={p.numero}
            type="button"
            className="fio-pouso-lugar"
            aria-pressed={p.numero === visto.numero}
            aria-label={`${p.lugar.nome}: pouso ${String(p.numero)}, cacto com ${String(p.flores)} ${p.flores === 1 ? 'flor' : 'flores'}`}
            onClick={() => {
              setEscolhido(p.numero);
            }}
          >
            {p.lugar.nome}
            <FloresDaPilula quantas={p.flores} />
          </button>
        ))}
      </div>
      <div className="fio-pouso-saida">
        <button
          type="button"
          className="fio-lua"
          aria-label="Descansar por hoje"
          onClick={() => {
            // A etapa conta e o Agora diz, uma vez, que está tudo salvo.
            marcarPausa('descanso');
            fio.pousarEtapa();
          }}
        >
          <span className="fio-lua-disco">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
            </svg>
          </span>
          descansar
        </button>
        <FioQueSePuxa
          forma="pouso"
          titulo="Puxe para seguir"
          rotuloDoNo="Puxar o fio: seguir para o próximo passo"
          aoPuxar={() => {
            fio.pousarEtapa();
          }}
        />
        <span aria-hidden="true" />
      </div>
    </section>
  );
}

/**
 * O pouso (D-D25, protótipo v16 da Marca): a etapa fecha numa cena (o Zé diante de um lugar da vereda, com o
 * jardim dele) e nos fatos do que foi feito, em frases curtas e sem placar. Passo pulado não deixa fato, e a
 * falta dele não vira aviso. Puxar o fio conta a etapa e volta ao Agora; "descansar" faz o mesmo e o Agora diz
 * que está tudo salvo. O próximo puxão planeja a etapa seguinte.
 */
export function PousoDoFio() {
  const fio = useFio();
  const { avanco } = fio;
  if (fio.falhou) {
    return (
      <p className="fio-quieto" role="alert">
        Não deu para ler seus dados agora. Nada se perdeu; tente de novo em instantes.
      </p>
    );
  }
  if (!avanco) return <Esqueleto linhas={3} />;
  if (avanco.proximo.tipo !== 'pouso') return <Navigate to="/" replace />;
  return <PousoEmCena pouso={avanco.proximo.pouso} fio={fio} />;
}
