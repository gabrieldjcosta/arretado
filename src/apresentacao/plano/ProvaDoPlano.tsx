// A data da prova objetiva (AP-03): um campo opcional. O app a usa só para não marcar Revisão depois
// dela e para fazer uma passada final pelos Pontos mais cobrados; não mostra contagem regressiva.
import { useState } from 'react';
import { dataDaProvaInformada, definirDataDaProva } from '../../dominios/recall/prova';
import { hoje as hojeDe } from '../../dominios/recall/servico';
import { useDados, useRepositorio } from '../dados/contexto';

const formatar = (d: string) => d.split('-').reverse().join('/');

export function ProvaDoPlano() {
  const repo = useRepositorio();
  const { dados } = useDados(dataDaProvaInformada);
  const [digitada, setDigitada] = useState<string | null>(null);
  const [falha, setFalha] = useState(false);
  const hoje = hojeDe(repo);
  const valor = digitada ?? dados ?? '';
  const mudou = valor !== (dados ?? '');
  const valida = valor === '' || valor > hoje;

  const gravar = (data: string | null) => {
    setFalha(false);
    definirDataDaProva(repo, data).then(
      () => {
        setDigitada(null);
      },
      () => {
        setFalha(true);
      },
    );
  };

  return (
    <section className="prova-do-plano" aria-label="Data da prova">
      <div className="campo">
        <label htmlFor="data-da-prova">Data da prova objetiva (opcional)</label>
        <input
          id="data-da-prova"
          type="date"
          min={hoje}
          value={valor}
          onChange={(e) => {
            setDigitada(e.target.value);
          }}
        />
      </div>
      <p className="dica">
        Só para as revisões não caírem depois dela e para passar de novo pelos pontos mais cobrados
        na última semana. Nada é contado nem cobrado.
      </p>
      <div className="linha-acoes">
        <button
          type="button"
          disabled={!mudou || !valida || valor === ''}
          onClick={() => {
            gravar(valor);
          }}
        >
          Guardar a data
        </button>
        {dados !== undefined && (
          <button
            type="button"
            className="botao-texto"
            onClick={() => {
              gravar(null);
            }}
          >
            Tirar a data
          </button>
        )}
      </div>
      {dados !== undefined && !mudou && (
        <p role="status" className="dica">
          {dados > hoje
            ? `Prova guardada: ${formatar(dados)}.`
            : `Prova guardada: ${formatar(dados)}. Já passou; atualize quando souber a próxima.`}
        </p>
      )}
      {falha && (
        <p role="alert" className="aviso falha">
          Não foi possível guardar a data. Nada foi alterado.
        </p>
      )}
    </section>
  );
}
