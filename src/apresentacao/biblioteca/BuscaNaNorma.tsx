import { useCallback, useDeferredValue, useId, useMemo } from 'react';
import {
  buscarTexto,
  resolverEndereco,
  type Achado,
  type TextoBuscavel,
} from '../../dominios/legislacao/busca';
import { possiveisEnderecos } from '../../dominios/legislacao/sumulas';
import { Dialogo } from '../componentes/Dialogo';

/** Achados do texto mostrados na lista (o total vem inteiro). */
export const ACHADOS_NA_LISTA = 100;
/** Letras do texto antes e depois do trecho achado, no resumo de cada achado. */
const CONTEXTO_ANTES = 40;
const CONTEXTO_DEPOIS = 80;

export type TextosDaBusca =
  | { estado: 'carregando' }
  | { estado: 'pronto'; buscaveis: readonly TextoBuscavel[] }
  | { estado: 'falha' };

/**
 * Busca dentro da norma (F2, 11.6), num diálogo: por endereço ("112", "§ 2º do 112") e por texto,
 * sem acento e sem caixa. A consulta é do leitor (reabrir mostra a mesma). Escolher um resultado
 * fecha o diálogo e leva o dispositivo ao alto da tela (`irPara`, com o índice do nó).
 */
export function BuscaNaNorma({
  aberto,
  aoFechar,
  consulta,
  mudarConsulta,
  textos,
  tentarDeNovo,
  indiceDoEndereco,
  referencia,
  irPara,
}: {
  aberto: boolean;
  aoFechar: () => void;
  consulta: string;
  mudarConsulta: (consulta: string) => void;
  textos: TextosDaBusca;
  tentarDeNovo: () => void;
  /** O índice do nó com o endereço canônico, se a norma o tem. */
  indiceDoEndereco: (endereco: string) => number | undefined;
  /** "Art. 112, § 2º": a referência do nó (a da linha que o mostra). */
  referencia: (indice: number) => string;
  irPara: (indice: number) => void;
}) {
  const idCampo = useId();
  const idResumo = useId();
  // A lista da CF inteira é refeita a cada letra: o campo responde antes, a lista vem logo depois.
  const adiada = useDeferredValue(consulta);

  const acharEndereco = useCallback(
    (texto: string) => {
      const possiveis = possiveisEnderecos(texto);
      if (possiveis.length === 0) return undefined;
      const resolvido = resolverEndereco(possiveis, (e) => indiceDoEndereco(e) !== undefined);
      const indice = resolvido === undefined ? undefined : indiceDoEndereco(resolvido.endereco);
      return { indice, faltou: resolvido?.faltou !== undefined };
    },
    [indiceDoEndereco],
  );
  const endereco = useMemo(() => acharEndereco(adiada), [adiada, acharEndereco]);

  const resultado = useMemo(
    () =>
      textos.estado === 'pronto' && adiada.trim() !== ''
        ? buscarTexto(textos.buscaveis, adiada, ACHADOS_NA_LISTA)
        : undefined,
    [textos, adiada],
  );

  return (
    <Dialogo aberto={aberto} aoFechar={aoFechar} titulo="Buscar na norma" classe="dialogo-busca">
      <form
        role="search"
        className="busca-campo"
        onSubmit={(e) => {
          e.preventDefault();
          // Enter vai ao endereço, se há; senão, ao primeiro achado do texto. O que foi digitado
          // vale, não a consulta adiada: num aparelho lento o Enter chega antes da lista alcançá-la.
          const primeiro =
            acharEndereco(consulta)?.indice ??
            (textos.estado === 'pronto' && consulta.trim() !== ''
              ? buscarTexto(textos.buscaveis, consulta, 1).achados[0]?.indice
              : undefined);
          if (primeiro !== undefined) irPara(primeiro);
        }}
      >
        <label htmlFor={idCampo}>Texto ou endereço</label>
        <input
          id={idCampo}
          type="search"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-describedby={idResumo}
          placeholder="remição, 112, § 2º do 112"
          value={consulta}
          onChange={(e) => {
            mudarConsulta(e.target.value);
          }}
        />
      </form>
      {endereco && (
        <div className="busca-endereco">
          {endereco.indice === undefined ? (
            <p>Nenhum dispositivo com esse endereço nesta norma.</p>
          ) : (
            <>
              {endereco.faltou && <p>Esse dispositivo não existe nesta norma. O mais próximo:</p>}
              <button
                type="button"
                onClick={() => {
                  if (endereco.indice !== undefined) irPara(endereco.indice);
                }}
              >
                Ir para {referencia(endereco.indice)}
              </button>
            </>
          )}
        </div>
      )}
      <p id={idResumo} className="busca-resumo" aria-live="polite">
        {resumo(textos, adiada, resultado?.total)}
      </p>
      {textos.estado === 'falha' && (
        <button type="button" onClick={tentarDeNovo}>
          Tentar de novo
        </button>
      )}
      {resultado && resultado.achados.length > 0 && (
        <ol className="busca-achados" aria-label="Achados no texto">
          {resultado.achados.map((achado) => (
            <li key={`${String(achado.indice)}:${String(achado.inicio)}`}>
              <button
                type="button"
                onClick={() => {
                  irPara(achado.indice);
                }}
              >
                <strong>{referencia(achado.indice)}</strong> <Resumo achado={achado} />
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="linha-acoes">
        <button type="button" onClick={aoFechar}>
          Fechar
        </button>
      </div>
    </Dialogo>
  );
}

function resumo(textos: TextosDaBusca, consulta: string, total: number | undefined): string {
  if (consulta.trim() === '') return 'Busca no texto vigente, sem acento e sem caixa.';
  if (textos.estado === 'carregando') return 'Preparando a busca no texto…';
  if (textos.estado === 'falha') return 'Não foi possível ler o texto da norma para a busca.';
  if (!total) return 'Nada achado no texto.';
  const achados = total === 1 ? '1 achado no texto' : `${String(total)} achados no texto`;
  return total > ACHADOS_NA_LISTA
    ? `${achados}; os ${String(ACHADOS_NA_LISTA)} primeiros abaixo.`
    : `${achados}.`;
}

/** O trecho achado em volta do contexto, cortado na palavra, com o achado marcado. */
function Resumo({ achado }: { achado: Achado }) {
  const { texto, inicio, fim } = achado;
  let de = Math.max(0, inicio - CONTEXTO_ANTES);
  let ate = Math.min(texto.length, fim + CONTEXTO_DEPOIS);
  if (de > 0) de = texto.indexOf(' ', de) + 1 || de;
  if (de > inicio) de = inicio;
  if (ate < texto.length) ate = Math.max(fim, texto.lastIndexOf(' ', ate));
  return (
    <span className="busca-trecho">
      {de > 0 && '…'}
      {texto.slice(de, inicio)}
      <mark>{texto.slice(inicio, fim)}</mark>
      {texto.slice(fim, ate)}
      {ate < texto.length && '…'}
    </span>
  );
}
