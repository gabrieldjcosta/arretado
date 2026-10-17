// Passo "Quais matérias entram no plano?": cada matéria é um cartão com a árvore de assuntos, e a pessoa
// pode acrescentar matéria e assunto que o catálogo não trouxe.
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import {
  chaveDeNome,
  disciplinasDoEdital,
  rotuloDoEdital,
  type EditalDoCatalogo,
} from '../../../dominios/catalogo';
import { chaveDoItem } from '../../../integracoes/catalogo/linhas';
import type { Acrescentos } from './rascunho';
import './estilos-onboarding.css';

/** Campo + botão para acrescentar um nome; o pai devolve o aviso quando o nome não entra. */
function CampoAcrescentar({
  id,
  rotulo,
  botao,
  aoAcrescentar,
}: {
  id: string;
  rotulo: string;
  botao: string;
  aoAcrescentar: (texto: string) => string | undefined;
}) {
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState<string>();
  const campo = useRef<HTMLInputElement>(null);
  const enviar = (e: SyntheticEvent) => {
    e.preventDefault();
    const recusa = aoAcrescentar(texto);
    setAviso(recusa);
    if (!recusa) setTexto('');
    campo.current?.focus();
  };
  return (
    <form className="onboarding-acrescentar" onSubmit={enviar}>
      <label htmlFor={id}>{rotulo}</label>
      <div className="linha-acoes">
        <input
          id={id}
          ref={campo}
          type="text"
          value={texto}
          aria-describedby={aviso ? `${id}-aviso` : undefined}
          onChange={(e) => {
            setTexto(e.target.value);
          }}
        />
        <button type="submit">{botao}</button>
      </div>
      {aviso && (
        <p id={`${id}-aviso`} role="status" className="dica">
          {aviso}
        </p>
      )}
    </form>
  );
}

interface AssuntoDaArvore {
  id: string;
  texto: string;
  codigo?: string;
  /** Acrescentado pela pessoa. */
  seu?: boolean;
}

export function PassoDisciplinas({
  edital,
  desmarcadas,
  dispensados,
  acrescentos,
  aoAlternarDisciplina,
  aoAlternarAssunto,
  aoAcrescentarAssunto,
  aoAcrescentarDisciplina,
  aoTirarAssunto,
  aoTirarDisciplina,
}: {
  edital: EditalDoCatalogo;
  desmarcadas: ReadonlySet<string>;
  dispensados: ReadonlySet<string>;
  acrescentos: Acrescentos;
  aoAlternarDisciplina: (chave: string) => void;
  aoAlternarAssunto: (chave: string) => void;
  /** Devolvem o aviso quando o nome não entra. */
  aoAcrescentarAssunto: (disciplina: string, texto: string) => string | undefined;
  aoAcrescentarDisciplina: (nome: string) => string | undefined;
  aoTirarAssunto: (disciplina: string, titulo: string) => void;
  aoTirarDisciplina: (nome: string) => void;
}) {
  // Assuntos recolhidos: a lista de uma disciplina só é montada quando ela é aberta.
  const [abertas, setAbertas] = useState<ReadonlySet<string>>(new Set());
  // Matéria recém-acrescentada: o foco vai para o campo de assunto dela assim que abrir.
  const foco = useRef<string>(undefined);
  useEffect(() => {
    if (!foco.current) return;
    document.getElementById(`acrescentar-assunto-${foco.current}`)?.focus();
    foco.current = undefined;
  });
  const abrir = (chave: string, aberto: boolean) => {
    setAbertas((atual) => {
      if (atual.has(chave) === aberto) return atual;
      const novo = new Set(atual);
      if (aberto) novo.add(chave);
      else novo.delete(chave);
      return novo;
    });
  };
  const doEdital = disciplinasDoEdital(edital).map(({ disciplina, nome }) => ({
    nome,
    seu: false,
    assuntos: disciplina.itens.map((item, i): AssuntoDaArvore => ({
      id: chaveDoItem(nome, i),
      texto: item.assunto,
      ...(item.numero ? { codigo: item.numero } : {}),
    })),
  }));
  const todas = [
    ...doEdital,
    ...acrescentos.disciplinas.map((nome) => ({ nome, seu: true, assuntos: [] })),
  ].map((d) => {
    const chave = chaveDeNome(d.nome);
    const seus = acrescentos.assuntos
      .filter((a) => chaveDeNome(a.disciplina) === chave)
      .map((a): AssuntoDaArvore => ({
        id: `seu#${chave}#${chaveDeNome(a.titulo)}`,
        texto: a.titulo,
        seu: true,
      }));
    return { ...d, chave, assuntos: [...d.assuntos, ...seus] };
  });
  return (
    <>
      <p className="dica">
        {rotuloDoEdital(edital)}. Tudo já vem marcado; desmarque o que não cai.
      </p>
      <ul className="onboarding-disciplinas">
        {todas.map(({ nome, chave, seu, assuntos }) => {
          const marcada = !desmarcadas.has(chave);
          const dispensado = (a: AssuntoDaArvore) => !a.seu && dispensados.has(a.id);
          const marcados = assuntos.filter((a) => !dispensado(a)).length;
          return (
            <li
              key={chave}
              className="onboarding-cartao"
              data-desmarcada={marcada ? undefined : ''}
            >
              <div className="onboarding-cabeca">
                <label className="onboarding-opcao">
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() => {
                      aoAlternarDisciplina(chave);
                    }}
                  />
                  <span>{nome}</span>
                </label>
                {seu && <span className="selo">seu</span>}
                {seu && (
                  <button
                    type="button"
                    className="discreto"
                    aria-label={`Tirar a matéria ${nome}`}
                    onClick={() => {
                      aoTirarDisciplina(nome);
                    }}
                  >
                    Tirar
                  </button>
                )}
              </div>
              <details className="onboarding-galho" open={abertas.has(chave)}>
                <summary
                  onClick={(e) => {
                    // Aberto/fechado fica no estado: o `<details>` só mostra.
                    e.preventDefault();
                    abrir(chave, !abertas.has(chave));
                  }}
                >
                  <span className="onboarding-seta" aria-hidden="true" />
                  <span>Assuntos</span>
                  <span className="selo">
                    {marcados < assuntos.length
                      ? `${String(marcados)} de ${String(assuntos.length)}`
                      : String(assuntos.length)}
                  </span>
                </summary>
                {abertas.has(chave) && (
                  <>
                    <ul className="onboarding-assuntos">
                      {assuntos.map((a) => (
                        <li key={a.id}>
                          <label className="onboarding-opcao">
                            <input
                              type="checkbox"
                              checked={marcada && !dispensado(a)}
                              disabled={!marcada || a.seu === true}
                              onChange={() => {
                                aoAlternarAssunto(a.id);
                              }}
                            />
                            <span>
                              {a.texto}
                              {a.codigo && <span className="dica"> {a.codigo}</span>}
                            </span>
                          </label>
                          {a.seu && <span className="selo">seu</span>}
                          {a.seu && (
                            <button
                              type="button"
                              className="discreto"
                              aria-label={`Tirar o assunto ${a.texto}`}
                              onClick={() => {
                                aoTirarAssunto(nome, a.texto);
                              }}
                            >
                              Tirar
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                    <CampoAcrescentar
                      id={`acrescentar-assunto-${chave}`}
                      rotulo={`+ Acrescentar assunto em ${nome}`}
                      botao="Acrescentar"
                      aoAcrescentar={(texto) => aoAcrescentarAssunto(nome, texto)}
                    />
                  </>
                )}
              </details>
            </li>
          );
        })}
      </ul>
      <CampoAcrescentar
        id="acrescentar-disciplina"
        rotulo="+ Acrescentar disciplina"
        botao="Acrescentar disciplina"
        aoAcrescentar={(texto) => {
          const aviso = aoAcrescentarDisciplina(texto);
          if (!aviso) {
            const chave = chaveDeNome(texto);
            abrir(chave, true);
            foco.current = chave;
          }
          return aviso;
        }}
      />
    </>
  );
}
