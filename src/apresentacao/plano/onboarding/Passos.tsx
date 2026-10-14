// Telas do onboarding do plano (pacote B2): cada passo é uma pergunta, sem estado próprio além do que
// a tela mostra; o estado e a gravação do rascunho ficam em `Onboarding.tsx`.
import { useState, type ReactNode } from 'react';
import {
  chaveDeNome,
  disciplinasDoEdital,
  explicarFaixa,
  rotuloDoEdital,
  type CarreiraDoCatalogo,
  type EditalDoCatalogo,
  type EntradaDaCarreira,
} from '../../../dominios/catalogo';
import { chaveDoItem } from '../../../integracoes/catalogo/linhas';
import { BarraFina } from '../../componentes/BarraFina';
import './estilos-onboarding.css';

export const TOTAL_DE_PASSOS = 4;

export function Moldura({
  passo,
  titulo,
  children,
  aoVoltar,
  aoPular,
}: {
  passo: number;
  titulo: string;
  children: ReactNode;
  aoVoltar?: () => void;
  aoPular: () => void;
}) {
  return (
    <section className="onboarding" aria-labelledby="onboarding-titulo">
      <h1>Montar o plano</h1>
      <BarraFina valor={passo} max={TOTAL_DE_PASSOS} rotulo="Passo do plano" />
      <h2 id="onboarding-titulo">{titulo}</h2>
      {children}
      <div className="linha-acoes onboarding-navegacao">
        {aoVoltar && (
          <button type="button" onClick={aoVoltar}>
            Voltar
          </button>
        )}
        <button type="button" className="discreto" onClick={aoPular}>
          Pular, não tenho edital
        </button>
      </div>
    </section>
  );
}

export function PassoCarreira({
  carreiras,
  escolhida,
  aoEscolher,
}: {
  carreiras: readonly EntradaDaCarreira[];
  escolhida?: string;
  aoEscolher: (slug: string) => void;
}) {
  const disponiveis = carreiras.filter((c) => c.disponivel);
  const emBreve = carreiras.filter((c) => !c.disponivel);
  return (
    <fieldset className="onboarding-opcoes">
      <legend className="dica">Você pode mudar isso depois.</legend>
      {disponiveis.map((c) => (
        <label key={c.slug} className="onboarding-opcao">
          <input
            type="radio"
            name="carreira"
            checked={escolhida === c.slug}
            onChange={() => {
              aoEscolher(c.slug);
            }}
          />
          <span>{c.nome}</span>
        </label>
      ))}
      {emBreve.length > 0 && (
        <p className="dica">Em breve: {emBreve.map((c) => c.nome).join(', ')}.</p>
      )}
    </fieldset>
  );
}

export function PassoEdital({
  editais,
  escolhido,
  aoEscolher,
}: {
  editais: readonly EditalDoCatalogo[];
  escolhido?: string;
  aoEscolher: (id: string) => void;
}) {
  return (
    <fieldset className="onboarding-opcoes">
      <legend className="dica">
        Os assuntos vêm de editais recentes. Escolha o que mais se parece com o seu.
      </legend>
      {editais.map((e) => (
        <label key={e.id} className="onboarding-opcao">
          <input
            type="radio"
            name="edital"
            checked={escolhido === e.id}
            onChange={() => {
              aoEscolher(e.id);
            }}
          />
          <span>
            {e.cargo ? `${e.cargo}, ` : ''}
            {rotuloDoEdital(e)}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function PassoDisciplinas({
  carreira,
  edital,
  desmarcadas,
  dispensados,
  aoAlternarDisciplina,
  aoAlternarAssunto,
}: {
  carreira: CarreiraDoCatalogo;
  edital: EditalDoCatalogo;
  desmarcadas: ReadonlySet<string>;
  dispensados: ReadonlySet<string>;
  aoAlternarDisciplina: (chave: string) => void;
  aoAlternarAssunto: (chave: string) => void;
}) {
  // Assuntos recolhidos: a lista de uma disciplina só é montada quando ela é aberta.
  const [abertas, setAbertas] = useState<ReadonlySet<string>>(new Set());
  const consolidadas = new Map(carreira.disciplinas.map((d) => [chaveDeNome(d.nome), d]));
  return (
    <>
      <p className="dica">
        {rotuloDoEdital(edital)}. Tudo já vem marcado; desmarque o que não cai.
      </p>
      <ul className="onboarding-disciplinas">
        {disciplinasDoEdital(edital).map(({ disciplina, nome }) => {
          const chave = chaveDeNome(nome);
          const marcada = !desmarcadas.has(chave);
          const base = consolidadas.get(chave);
          const dica = base ? explicarFaixa(base) : '';
          return (
            <li key={chave}>
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
              {dica && <p className="dica">{dica}</p>}
              <details
                onToggle={(e) => {
                  const aberto = e.currentTarget.open;
                  setAbertas((atual) => {
                    const novo = new Set(atual);
                    if (aberto) novo.add(chave);
                    else novo.delete(chave);
                    return novo;
                  });
                }}
              >
                <summary>Assuntos ({disciplina.itens.length})</summary>
                {abertas.has(chave) && (
                  <ul className="onboarding-assuntos">
                    {disciplina.itens.map((item, i) => {
                      const id = chaveDoItem(nome, i);
                      return (
                        <li key={id}>
                          <label className="onboarding-opcao">
                            <input
                              type="checkbox"
                              checked={marcada && !dispensados.has(id)}
                              disabled={!marcada}
                              onChange={() => {
                                aoAlternarAssunto(id);
                              }}
                            />
                            <span>
                              {item.numero ? `${item.numero}. ` : ''}
                              {item.assunto}
                            </span>
                          </label>
                          {item.faixa && item.obsFaixa && (
                            <span className="marcador">Sugerida: {item.faixa}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </details>
            </li>
          );
        })}
      </ul>
    </>
  );
}
