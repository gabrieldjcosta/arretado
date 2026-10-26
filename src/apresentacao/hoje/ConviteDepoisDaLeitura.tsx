// Depois da primeira leitura, um convite quieto no Hoje: o jeito de levar um trecho às Frases. Só
// aparece enquanto a pessoa não tem Frase nenhuma e já leu uma norma; "Agora não" o apaga de vez
// (para esse aparelho). Texto sem cobrança: é um caminho, não uma pendência.
import { useState } from 'react';
import { Link } from 'react-router';
import type { Repositorio } from '../../core/persistencia';
import { lidaEm } from '../../dominios/legislacao/leituras';
import { useDados } from '../dados/contexto';
import './estilos-hoje.css';

const CHAVE = 'arretado.conviteFrases.dispensado';

const dispensado = (): boolean => {
  try {
    return localStorage.getItem(CHAVE) === '1';
  } catch {
    return false;
  }
};

async function carregar(repo: Repositorio) {
  const [leituras, frases] = await Promise.all([
    repo.colecao('leituras').todosDoUsuario(),
    repo.colecao('frases').contar(),
  ]);
  if (frases > 0) return undefined;
  const lidas = leituras.filter(
    (l) => l.excluidoEm === null && (l.posicaoId !== undefined || l.lidoAteId !== undefined),
  );
  const recente = lidas.sort((a, b) => lidaEm(b).localeCompare(lidaEm(a)))[0];
  const norma = recente ? await repo.colecao('normas').obter(recente.normaId) : undefined;
  return norma && norma.excluidoEm === null
    ? { normaId: norma.id, titulo: norma.tituloCurto }
    : undefined;
}

export function ConviteDepoisDaLeitura() {
  const { dados } = useDados(carregar);
  const [fechado, setFechado] = useState(dispensado);
  if (!dados || fechado) return null;
  return (
    <div className="convite-depois-da-leitura">
      <p>
        Algo em {dados.titulo} vale lembrar? Selecione o trecho e toque em “Enviar às frases”: ele
        vira uma Frase para a Revisão.
      </p>
      <div className="linha-acoes">
        <Link to={`/biblioteca/normas/${dados.normaId}`} className="botao botao-texto na-margem">
          Abrir {dados.titulo}
        </Link>
        <button
          type="button"
          className="discreto"
          onClick={() => {
            try {
              localStorage.setItem(CHAVE, '1');
            } catch {
              /* sem armazenamento: some só até recarregar */
            }
            setFechado(true);
          }}
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
