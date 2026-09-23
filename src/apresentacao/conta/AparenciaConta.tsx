import { useCallback, useState } from 'react';
import type { Preferencias, Tema } from '../../core/modelo';
import { alterarPreferencias, obterPreferencias } from '../../core/preferencias';
import { Esqueleto } from '../componentes/estados';
import { useDados, useRepositorio } from '../dados/contexto';

const TEMAS: { valor: Tema; nome: string }[] = [
  { valor: 'sistema', nome: 'Igual ao aparelho' },
  { valor: 'claro', nome: 'Claro' },
  { valor: 'escuro', nome: 'Escuro' },
];

export function AparenciaConta() {
  const repo = useRepositorio();
  const { dados: salvas } = useDados(useCallback((r) => obterPreferencias(r), []));
  // Resposta imediata ao toque; a gravação confirma logo depois.
  const [pendentes, setPendentes] = useState<Partial<Preferencias>>({});
  if (!salvas) return <Esqueleto />;
  const dados = { ...salvas, ...pendentes };

  const alterar = (
    mudanca: Partial<Pick<Preferencias, 'tema' | 'fonteLeitura' | 'tamanhoFonte'>>,
  ) => {
    setPendentes((p) => ({ ...p, ...mudanca }));
    void alterarPreferencias(repo, mudanca);
  };

  return (
    <>
      <h1>Aparência</h1>
      <fieldset>
        <legend>Tema</legend>
        {TEMAS.map((t) => (
          <label key={t.valor} className="opcao">
            <input
              type="radio"
              name="tema"
              checked={dados.tema === t.valor}
              onChange={() => {
                alterar({ tema: t.valor });
              }}
            />
            {t.nome}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Fonte de leitura</legend>
        <label className="opcao">
          <input
            type="radio"
            name="fonte"
            checked={dados.fonteLeitura === 'serifa'}
            onChange={() => {
              alterar({ fonteLeitura: 'serifa' });
            }}
          />
          Com serifa
        </label>
        <label className="opcao">
          <input
            type="radio"
            name="fonte"
            checked={dados.fonteLeitura === 'sem_serifa'}
            onChange={() => {
              alterar({ fonteLeitura: 'sem_serifa' });
            }}
          />
          Sem serifa
        </label>
        <div className="campo">
          <label htmlFor="tamanho-fonte">
            Tamanho do texto de leitura: {dados.tamanhoFonte} px
          </label>
          <input
            id="tamanho-fonte"
            type="range"
            min={12}
            max={32}
            step={1}
            value={dados.tamanhoFonte}
            onChange={(e) => {
              alterar({ tamanhoFonte: Number(e.target.value) });
            }}
          />
        </div>
        <p className="texto-leitura">
          Art. 1º A execução penal tem por objetivo efetivar as disposições de sentença ou decisão
          criminal.
        </p>
      </fieldset>
    </>
  );
}
