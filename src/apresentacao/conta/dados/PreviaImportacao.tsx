import { useState } from 'react';
import type { NomeColecao } from '../../../core/modelo';
import type { Conflito, Previa } from '../../../core/pacote';
import { formatarInstante, ROTULO_COLECAO } from './rotulos';

const CAMPOS_RESUMO = [
  'oQueFoi',
  'frente',
  'titulo',
  'tituloCurto',
  'tituloTese',
  'nome',
  'descricao',
];

function resumo(registro: Record<string, unknown>): string {
  for (const campo of CAMPOS_RESUMO) {
    const v = registro[campo];
    if (typeof v === 'string' && v.trim()) return v.length > 80 ? `${v.slice(0, 80)}…` : v;
  }
  return registro.id as string;
}

export type Resolucoes = ReadonlyMap<string, 'local' | 'pacote'>;

/** Prévia obrigatória (Parte 2 §12.3) com escolha explícita em cada conflito. */
export function PreviaImportacao({
  previa,
  confirmando,
  rotuloConfirmar = 'Confirmar importação',
  aoConfirmar,
  aoVoltar,
}: {
  previa: Previa;
  confirmando: boolean;
  rotuloConfirmar?: string;
  aoConfirmar: (resolucoes: Resolucoes) => void;
  aoVoltar: () => void;
}) {
  const [resolucoes, setResolucoes] = useState<Map<string, 'local' | 'pacote'>>(new Map());
  const linhas = (
    Object.entries(previa.porColecao) as [
      NomeColecao,
      NonNullable<Previa['porColecao'][NomeColecao]>,
    ][]
  ).filter(([, r]) => r.criar + r.atualizar + r.excluir + r.conflitos > 0);

  const escolherTodos = (lado: 'local' | 'pacote') => {
    setResolucoes(new Map(previa.conflitos.map((c) => [c.chave, lado])));
  };

  return (
    <section aria-labelledby="t-previa">
      <h3 id="t-previa">Prévia</h3>
      {previa.substituiIdentidade && (
        <p className="aviso">
          Este pacote é de outra identidade: todos os dados deste aparelho serão substituídos pelos
          do pacote.
        </p>
      )}
      {linhas.length === 0 ? (
        <p>Nada muda: os dados deste aparelho já estão iguais ao pacote.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col" className="numero">
                Criar
              </th>
              <th scope="col" className="numero">
                Atualizar
              </th>
              <th scope="col" className="numero">
                Excluir
              </th>
              <th scope="col" className="numero">
                Conflitos
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(([nome, r]) => (
              <tr key={nome}>
                <th scope="row">{ROTULO_COLECAO[nome]}</th>
                <td className="numero">{r.criar}</td>
                <td className="numero">{r.atualizar}</td>
                <td className="numero">{r.excluir}</td>
                <td className="numero">{r.conflitos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {previa.totalExclusoes > 0 && (
        <p className="aviso">
          {previa.totalExclusoes === 1
            ? '1 item deste aparelho será excluído.'
            : `${String(previa.totalExclusoes)} itens deste aparelho serão excluídos.`}
        </p>
      )}
      {previa.avisos
        .filter(
          (a) => !previa.substituiIdentidade || !a.startsWith('O pacote é de outra identidade'),
        )
        .map((a) => (
          <p key={a} className="aviso">
            {a}
          </p>
        ))}
      {previa.conflitos.length > 0 && (
        <fieldset>
          <legend>Mudou dos dois lados: qual versão manter?</legend>
          <div className="linha-acoes">
            <button
              type="button"
              onClick={() => {
                escolherTodos('local');
              }}
            >
              Manter todos os deste aparelho
            </button>
            <button
              type="button"
              onClick={() => {
                escolherTodos('pacote');
              }}
            >
              Usar todos os do pacote
            </button>
          </div>
          <ul className="lista-simples">
            {previa.conflitos.map((c: Conflito) => {
              const escolha = resolucoes.get(c.chave) ?? 'local';
              const mudar = (lado: 'local' | 'pacote') => {
                setResolucoes((atual) => new Map(atual).set(c.chave, lado));
              };
              return (
                <li key={c.chave}>
                  <span>
                    {ROTULO_COLECAO[c.colecao]}: {resumo(c.local)}
                  </span>
                  <span>
                    <label className="opcao">
                      <input
                        type="radio"
                        name={`conflito-${c.chave}`}
                        checked={escolha === 'local'}
                        onChange={() => {
                          mudar('local');
                        }}
                      />
                      Deste aparelho ({formatarInstante(c.local.atualizadoEm as string)})
                    </label>
                    <label className="opcao">
                      <input
                        type="radio"
                        name={`conflito-${c.chave}`}
                        checked={escolha === 'pacote'}
                        onChange={() => {
                          mudar('pacote');
                        }}
                      />
                      Do pacote ({formatarInstante(c.pacote.atualizadoEm as string)}):{' '}
                      {resumo(c.pacote)}
                    </label>
                  </span>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}
      {previa.escreve && (
        <p className="dica">
          Antes de alterar, será criado um ponto de restauração: você poderá desfazer em Conta ›
          Dados.
        </p>
      )}
      <div className="linha-acoes">
        <button
          type="button"
          className="principal"
          disabled={confirmando}
          onClick={() => {
            aoConfirmar(resolucoes);
          }}
        >
          {confirmando ? 'Importando…' : rotuloConfirmar}
        </button>
        <button type="button" onClick={aoVoltar} disabled={confirmando}>
          Voltar
        </button>
      </div>
    </section>
  );
}
