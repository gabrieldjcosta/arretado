import { useId, useState } from 'react';
import type { CausaErro, Disciplina, Erro, Ponto } from '../../core/modelo';
import { NOME_CAUSA } from '../../dominios/recall/causa';
import { CAUSAS } from './rotulos';

/** Campos opcionais do Erro (o "completar depois"). Nada aqui é obrigatório (D9). */
export type Complemento = Partial<
  Pick<
    Erro,
    | 'fraseCorreta'
    | 'causa'
    | 'conviccao'
    | 'fonte'
    | 'respostaDada'
    | 'respostaCorreta'
    | 'justificativa'
    | 'disciplinaId'
    | 'pontoId'
  >
>;

export function CamposErro({
  valor,
  aoMudar,
  causaSugerida,
  pontos = [],
  disciplinas = [],
  semFraseNemVinculos = false,
}: {
  valor: Complemento;
  aoMudar: (mudanca: Complemento) => void;
  causaSugerida?: CausaErro | undefined;
  pontos?: Ponto[];
  disciplinas?: Disciplina[];
  /** A captura mostra a frase, a disciplina e o ponto fora de "mais detalhes" (D25). */
  semFraseNemVinculos?: boolean;
}) {
  const id = useId();
  const texto = (campo: keyof Complemento) => (e: { target: { value: string } }) => {
    aoMudar({ [campo]: e.target.value === '' ? undefined : e.target.value });
  };
  const fonte = valor.fonte ?? {};
  const mudarFonte = (campo: keyof NonNullable<Erro['fonte']>, v: string) => {
    const nova: Record<string, unknown> = { ...fonte };
    if (v.trim() === '') Reflect.deleteProperty(nova, campo);
    else nova[campo] = campo === 'ano' ? Number(v) : v;
    aoMudar({ fonte: Object.keys(nova).length > 0 ? nova : undefined });
  };

  return (
    <>
      {!semFraseNemVinculos && (
        <div className="campo">
          <label htmlFor={`${id}-frase`}>Frase correta</label>
          <textarea
            id={`${id}-frase`}
            rows={2}
            maxLength={2_000}
            value={valor.fraseCorreta ?? ''}
            onChange={texto('fraseCorreta')}
            aria-describedby={`${id}-frase-dica`}
          />
          <p id={`${id}-frase-dica`} className="dica">
            A tese certa em uma linha. Vira o verso do cartão e entra na lista de frases.
          </p>
        </div>
      )}

      <fieldset>
        <legend>Causa</legend>
        {causaSugerida && !valor.causa && (
          <p className="dica">
            Sugerida: {NOME_CAUSA[causaSugerida]}.{' '}
            <button
              type="button"
              onClick={() => {
                aoMudar({ causa: causaSugerida });
              }}
            >
              Confirmar sugestão
            </button>
          </p>
        )}
        {CAUSAS.map((c) => (
          <label key={c} className="opcao">
            <input
              type="radio"
              name={`${id}-causa`}
              checked={valor.causa === c}
              onChange={() => {
                aoMudar({ causa: c });
              }}
            />
            {NOME_CAUSA[c]}
          </label>
        ))}
        <label className="opcao">
          <input
            type="radio"
            name={`${id}-causa`}
            checked={!valor.causa}
            onChange={() => {
              aoMudar({ causa: undefined });
            }}
          />
          Não sei ainda
        </label>
      </fieldset>

      <fieldset>
        <legend>Convicção quando respondeu</legend>
        {(
          [
            [1, 'Baixa'],
            [2, 'Média'],
            [3, 'Alta'],
          ] as const
        ).map(([n, nome]) => (
          <label key={n} className="opcao">
            <input
              type="radio"
              name={`${id}-conviccao`}
              checked={valor.conviccao === n}
              onChange={() => {
                aoMudar({ conviccao: n });
              }}
            />
            {nome}
          </label>
        ))}
      </fieldset>

      {!semFraseNemVinculos && disciplinas.length > 0 && (
        <div className="campo">
          <label htmlFor={`${id}-disciplina`}>Disciplina</label>
          <select
            id={`${id}-disciplina`}
            value={valor.disciplinaId ?? ''}
            onChange={texto('disciplinaId')}
          >
            <option value="">—</option>
            {disciplinas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
        </div>
      )}
      {!semFraseNemVinculos && pontos.length > 0 && (
        <div className="campo">
          <label htmlFor={`${id}-ponto`}>Ponto do edital</label>
          <select id={`${id}-ponto`} value={valor.pontoId ?? ''} onChange={texto('pontoId')}>
            <option value="">—</option>
            {pontos
              .filter((p) => !valor.disciplinaId || p.disciplinaId === valor.disciplinaId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo ? `${p.codigo} ` : ''}
                  {p.titulo}
                </option>
              ))}
          </select>
        </div>
      )}

      <fieldset>
        <legend>Fonte</legend>
        <div className="campo">
          <label htmlFor={`${id}-banca`}>Banca</label>
          <input
            id={`${id}-banca`}
            type="text"
            maxLength={500}
            value={fonte.banca ?? ''}
            onChange={(e) => {
              mudarFonte('banca', e.target.value);
            }}
          />
        </div>
        <div className="campo">
          <label htmlFor={`${id}-prova`}>Prova</label>
          <input
            id={`${id}-prova`}
            type="text"
            maxLength={500}
            value={fonte.prova ?? ''}
            onChange={(e) => {
              mudarFonte('prova', e.target.value);
            }}
          />
        </div>
        <CampoAno
          id={`${id}-ano`}
          ano={fonte.ano}
          aoMudar={(ano) => {
            mudarFonte('ano', ano === undefined ? '' : String(ano));
          }}
        />
        <div className="campo">
          <label htmlFor={`${id}-numero`}>Nº da questão</label>
          <input
            id={`${id}-numero`}
            type="text"
            maxLength={20}
            value={fonte.numero ?? ''}
            onChange={(e) => {
              mudarFonte('numero', e.target.value);
            }}
          />
        </div>
      </fieldset>

      <div className="campo">
        <label htmlFor={`${id}-dada`}>Resposta que dei</label>
        <input
          id={`${id}-dada`}
          type="text"
          value={valor.respostaDada ?? ''}
          onChange={texto('respostaDada')}
        />
      </div>
      <div className="campo">
        <label htmlFor={`${id}-correta`}>Resposta correta</label>
        <input
          id={`${id}-correta`}
          type="text"
          value={valor.respostaCorreta ?? ''}
          onChange={texto('respostaCorreta')}
        />
      </div>
      <div className="campo">
        <label htmlFor={`${id}-justificativa`}>Justificativa</label>
        <textarea
          id={`${id}-justificativa`}
          rows={3}
          value={valor.justificativa ?? ''}
          onChange={texto('justificativa')}
        />
      </div>
    </>
  );
}

/** Ano: aceita digitação parcial; só grava quando é um ano válido (1900–2100). */
function CampoAno({
  id,
  ano,
  aoMudar,
}: {
  id: string;
  ano: number | undefined;
  aoMudar: (ano: number | undefined) => void;
}) {
  const [texto, setTexto] = useState(ano !== undefined ? String(ano) : '');
  const numero = Number(texto);
  const valido = texto === '' || (/^\d{4}$/.test(texto) && numero >= 1900 && numero <= 2100);
  return (
    <div className="campo">
      <label htmlFor={id}>Ano</label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        maxLength={4}
        aria-invalid={!valido}
        aria-describedby={valido ? undefined : `${id}-dica`}
        value={texto}
        onChange={(e) => {
          const t = e.target.value.replace(/\D/g, '').slice(0, 4);
          setTexto(t);
          const n = Number(t);
          if (t === '') aoMudar(undefined);
          else if (t.length === 4 && n >= 1900 && n <= 2100) aoMudar(n);
        }}
      />
      {!valido && (
        <p id={`${id}-dica`} className="dica">
          Use 4 dígitos, de 1900 a 2100.
        </p>
      )}
    </div>
  );
}
