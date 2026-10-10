import { useCallback, useState } from 'react';
import { COTA_DIARIA_MAX, COTA_DIARIA_MIN, type Preferencias, type Tema } from '../../core/modelo';
import { alterarPreferencias, cotaDiaria, obterPreferencias } from '../../core/preferencias';
import { LegendaDestaques } from '../biblioteca/LegendaDestaques';
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
  const [falhou, setFalhou] = useState(false);
  // Texto do campo "Cartões por vez": só grava quando vale (inteiro de 5 a 100).
  const [cotaTexto, setCotaTexto] = useState<string | null>(null);
  if (!salvas) return <Esqueleto />;
  const dados = { ...salvas, ...pendentes };

  const alterar = (
    mudanca: Partial<
      Pick<
        Preferencias,
        | 'tema'
        | 'fonteLeitura'
        | 'tamanhoFonte'
        | 'destacarCondicionantesEPrazos'
        | 'reguaDeLeitura'
        | 'espiadaDosVizinhos'
        | 'cotaDiaria'
      >
    >,
  ) => {
    setFalhou(false);
    setPendentes((p) => ({ ...p, ...mudanca }));
    alterarPreferencias(repo, mudanca).catch(() => {
      // Volta ao que está gravado e avisa.
      setPendentes({});
      setFalhou(true);
    });
  };

  return (
    <>
      <h1>Aparência</h1>
      {falhou && (
        <p role="alert" className="aviso falha">
          Não foi possível guardar a mudança. A aparência continua como estava; tente de novo.
        </p>
      )}
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
      <fieldset>
        <legend>Leitura de normas</legend>
        <label className="opcao">
          <input
            type="checkbox"
            checked={dados.destacarCondicionantesEPrazos ?? false}
            aria-describedby="destaques-dica"
            onChange={(e) => {
              alterar({ destacarCondicionantesEPrazos: e.target.checked });
            }}
          />
          Destacar prazos, condições, termos absolutos e penas
        </label>
        <p id="destaques-dica" className="dica">
          Calculado na leitura, nunca gravado como grifo. Também liga e desliga no botão "Destaques"
          do leitor.
        </p>
        <LegendaDestaques comTraco />
        <label className="opcao">
          <input
            type="checkbox"
            checked={dados.reguaDeLeitura ?? false}
            aria-describedby="regua-dica"
            onChange={(e) => {
              alterar({ reguaDeLeitura: e.target.checked });
            }}
          />
          Régua de leitura
        </label>
        <p id="regua-dica" className="dica">
          Realça a linha sob o dedo, o cursor ou o foco. O texto não se move.
        </p>
        <label className="opcao">
          <input
            type="checkbox"
            checked={dados.espiadaDosVizinhos ?? false}
            aria-describedby="espiada-dica"
            onChange={(e) => {
              alterar({ espiadaDosVizinhos: e.target.checked });
            }}
          />
          Mostrar a espiada dos vizinhos no foco
        </label>
        <p id="espiada-dica" className="dica">
          No cartão do modo foco, duas linhas do artigo anterior e do próximo ficam esmaecidas.
        </p>
      </fieldset>
      <fieldset>
        <legend>Recall</legend>
        <label htmlFor="cota-diaria">Cartões por vez</label>{' '}
        <input
          id="cota-diaria"
          type="number"
          inputMode="numeric"
          min={COTA_DIARIA_MIN}
          max={COTA_DIARIA_MAX}
          step={1}
          aria-describedby="cota-dica"
          value={cotaTexto ?? String(cotaDiaria(dados))}
          onChange={(e) => {
            setCotaTexto(e.target.value);
            const n = Number(e.target.value);
            if (Number.isInteger(n) && n >= COTA_DIARIA_MIN && n <= COTA_DIARIA_MAX) {
              alterar({ cotaDiaria: n });
            }
          }}
          onBlur={() => {
            setCotaTexto(null);
          }}
        />
        <p id="cota-dica" className="dica">
          De {COTA_DIARIA_MIN} a {COTA_DIARIA_MAX}. Os outros esperam; nada é apagado.
        </p>
      </fieldset>
    </>
  );
}
