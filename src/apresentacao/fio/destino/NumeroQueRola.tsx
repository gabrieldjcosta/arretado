// O número do Destino que rola como um odômetro (Motion, `motion/mini`, sem peso a mais: o pacote já o
// carrega). Cada dígito é uma coluna de 0 a 9 que desliza até o valor novo; o da direita chega primeiro.
// O leitor de tela recebe o número em texto e ignora os dígitos desenhados. Com movimento reduzido o
// número aparece pronto; no Calmo só esmaece, sem deslocar nada.
import { useLayoutEffect, useRef, useState } from 'react';
import { animate } from 'motion/mini';
import { movimentoAgora } from '../../movimento';

const CURVA: [number, number, number, number] = [0.2, 0.7, 0.2, 1];
const DIGITOS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** O que cada número mostrou da última vez: ao voltar ao Destino depois de um pouso, o número rola de lá. */
const vistos = new Map<string, number>();

function Digito({ de, para, atraso }: { de: number; para: number; atraso: number }) {
  const coluna = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = coluna.current;
    if (!el) return;
    const alvo = `translateY(${String(-para * 10)}%)`;
    el.style.transform = alvo;
    if (de === para) return;
    const mov = movimentoAgora();
    if (mov === 'reduzido') return;
    if (mov === 'calmo') {
      animate(el, { opacity: [0.35, 1] }, { duration: 0.4 });
      return;
    }
    const origem = `translateY(${String(-de * 10)}%)`;
    el.style.transform = origem;
    const a = animate(
      el,
      { transform: [origem, alvo] },
      { duration: 0.8, delay: atraso, ease: CURVA },
    );
    void a.finished.then(
      () => {
        el.style.transform = alvo;
      },
      () => undefined,
    );
  }, [de, para, atraso]);
  return (
    <span className="rola-digito">
      <span className="rola-coluna" ref={coluna}>
        {DIGITOS.map((d) => (
          <i key={d} data-n={d} />
        ))}
      </span>
    </span>
  );
}

export function NumeroQueRola({ valor, chave }: { valor: number; chave: string }) {
  // O valor de antes é o que o número mostrou da última vez; mudando com a tela aberta, o de antes é o anterior.
  const [par, setPar] = useState({ de: vistos.get(chave) ?? valor, para: valor });
  if (par.para !== valor) setPar({ de: par.para, para: valor });
  useLayoutEffect(() => {
    vistos.set(chave, valor);
  }, [chave, valor]);
  const texto = String(par.para);
  const antes = String(par.de);
  return (
    <>
      <span className="visualmente-oculto">{texto}</span>
      <span className="rola" aria-hidden="true">
        {Array.from(texto).map((d, i) => {
          const daDireita = texto.length - 1 - i;
          // Um dígito que o número de antes não tinha parte do zero.
          const origem = daDireita < antes.length ? Number(antes[antes.length - 1 - daDireita]) : 0;
          return <Digito key={daDireita} de={origem} para={Number(d)} atraso={daDireita * 0.05} />;
        })}
      </span>
    </>
  );
}
