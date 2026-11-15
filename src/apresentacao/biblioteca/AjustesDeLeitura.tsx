import { useId } from 'react';
import { Link } from 'react-router';
import type { Preferencias } from '../../core/modelo';
import { Dialogo } from '../componentes/Dialogo';
import { temRealce } from './useReguaDeFoco';

export const TAMANHO_MINIMO = 12;
export const TAMANHO_MAXIMO = 32;
export const PASSO_DO_TAMANHO = 2;

export type ReguaDeFoco = NonNullable<Preferencias['reguaDeFoco']>;

/**
 * Os ajustes de leitura numa folha só: tamanho do texto, destaques e foco na frase. Abre pelo "Aa" da barra do
 * Leitor e, de qualquer ponto da norma, pelo "⋯" e pela bandeja do modo foco. Antes os três moravam soltos na barra
 * do alto: tomavam três linhas do celular antes da lei e só se alcançavam voltando ao começo da norma. Cada ajuste
 * vale na hora, sem "Salvar". A folha é baixa e fica embaixo, com a lei à vista em cima: é no texto que a pessoa
 * confere o ajuste. Um toque fora dela fecha.
 */
export function AjustesDeLeitura({
  aberto,
  aoFechar,
  tamanho,
  mudarTamanho,
  destacar,
  alternarDestaques,
  regua,
  mudarRegua,
}: {
  aberto: boolean;
  aoFechar: () => void;
  tamanho: number;
  mudarTamanho: (passo: number) => void;
  destacar: boolean;
  alternarDestaques: () => void;
  regua: ReguaDeFoco;
  mudarRegua: (nova: ReguaDeFoco) => void;
}) {
  const idDoTitulo = useId();
  const idDoFoco = useId();
  const dicaDosDestaques = useId();
  // O foco nas palavras de destaque acende os destaques por conta própria: enquanto ele vale, a caixa fica marcada e
  // parada, para não gravar "desligado" numa preferência que a tela mostra ligada.
  const presoPeloFoco = regua === 'palavras';
  // "Só a frase" pinta pela API de realce do navegador: sem ela a opção não aparece e, se era a escolhida, o que a
  // tela faz é o mesmo que desligado.
  const comFrase = temRealce();
  const escolhida = regua === 'frase' && !comFrase ? 'desligada' : regua;
  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      idDoTitulo={idDoTitulo}
      classe="folha-de-baixo dialogo-ajustes"
      tocarForaFecha
    >
      <div className="cabeca-da-folha">
        <h2 id={idDoTitulo}>Ajustes de leitura</h2>
        <button type="button" className="botao-texto" onClick={aoFechar}>
          Fechar
        </button>
      </div>
      <div className="ajuste-de-leitura">
        <span aria-hidden="true">Tamanho do texto</span>
        <div role="group" aria-label="Tamanho do texto" className="tamanho-texto">
          <button
            type="button"
            aria-label="A−, diminuir o texto"
            disabled={tamanho <= TAMANHO_MINIMO}
            onClick={() => {
              mudarTamanho(-PASSO_DO_TAMANHO);
            }}
          >
            A−
          </button>
          <output aria-label="Tamanho atual do texto">{tamanho} px</output>
          <button
            type="button"
            aria-label="A+, aumentar o texto"
            disabled={tamanho >= TAMANHO_MAXIMO}
            onClick={() => {
              mudarTamanho(PASSO_DO_TAMANHO);
            }}
          >
            A+
          </button>
        </div>
      </div>
      <label className="opcao">
        <input
          type="checkbox"
          checked={destacar}
          disabled={presoPeloFoco}
          aria-describedby={presoPeloFoco ? dicaDosDestaques : undefined}
          onChange={alternarDestaques}
        />
        Destacar prazos, condições, termos absolutos e penas
      </label>
      {presoPeloFoco && (
        <p id={dicaDosDestaques} className="dica">
          Fica ligado com o foco nas palavras de destaque.
        </p>
      )}
      <div className="ajuste-de-leitura">
        <label htmlFor={idDoFoco}>Foco na frase</label>
        <select
          id={idDoFoco}
          value={escolhida}
          onChange={(e) => {
            mudarRegua(e.target.value as ReguaDeFoco);
          }}
        >
          <option value="desligada">Desligado</option>
          {comFrase && <option value="frase">Só a frase em leitura</option>}
          <option value="palavras">Só as palavras de destaque</option>
        </select>
      </div>
      <p className="dica">
        A fonte e o tema ficam em <Link to="/conta/aparencia">Conta › Aparência</Link>.
      </p>
    </Dialogo>
  );
}
