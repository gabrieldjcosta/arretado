// Telas do onboarding do plano (pacote B2): cada passo é uma pergunta, sem estado próprio além do que
// a tela mostra; o estado e a gravação do rascunho ficam em `Onboarding.tsx`.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  chaveDeNome,
  disciplinasDoEdital,
  rotuloDoEdital,
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
  // Ao trocar de passo o foco vai para a pergunta: o botão que o tinha pode ter sumido.
  const pergunta = useRef<HTMLHeadingElement>(null);
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    pergunta.current?.focus();
  }, [passo]);
  return (
    <section className="onboarding" aria-labelledby="onboarding-titulo">
      <h1>Montar o plano</h1>
      <BarraFina valor={passo} max={TOTAL_DE_PASSOS} rotulo="Passo do plano" />
      <h2 id="onboarding-titulo" ref={pergunta} tabIndex={-1}>
        {titulo}
      </h2>
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
    <fieldset className="onboarding-opcoes" aria-labelledby="onboarding-titulo">
      <p className="dica">Você pode mudar isso depois.</p>
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
    <fieldset className="onboarding-opcoes" aria-labelledby="onboarding-titulo">
      <p className="dica">
        Os assuntos vêm de editais recentes. Escolha o que mais se parece com o seu.
      </p>
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
  edital,
  desmarcadas,
  dispensados,
  aoAlternarDisciplina,
  aoAlternarAssunto,
}: {
  edital: EditalDoCatalogo;
  desmarcadas: ReadonlySet<string>;
  dispensados: ReadonlySet<string>;
  aoAlternarDisciplina: (chave: string) => void;
  aoAlternarAssunto: (chave: string) => void;
}) {
  // Assuntos recolhidos: a lista de uma disciplina só é montada quando ela é aberta.
  const [abertas, setAbertas] = useState<ReadonlySet<string>>(new Set());
  return (
    <>
      <p className="dica">
        {rotuloDoEdital(edital)}. Tudo já vem marcado; desmarque o que não cai.
      </p>
      <ul className="onboarding-disciplinas">
        {disciplinasDoEdital(edital).map(({ disciplina, nome }) => {
          const chave = chaveDeNome(nome);
          const marcada = !desmarcadas.has(chave);
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
