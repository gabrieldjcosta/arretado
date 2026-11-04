import type { ReactNode } from 'react';
import { PularM, SetaM } from './IconesM';
import { useSaidaDoCartao } from './saida';

/** O ícone redondo "Pular este passo" do rodapé do cartão: o cartão sai para a esquerda. */
export function BotaoPular() {
  const saida = useSaidaDoCartao();
  return (
    <button type="button" className="m-icone" aria-label="Pular este passo" onClick={saida.pular}>
      <PularM />
    </button>
  );
}

/**
 * "Pular este passo" para quem não arrasta o cartão (teclado, leitor de tela). No mockup o Lembrar só se pula
 * com o gesto, e o rodapé só chega com a resposta; este botão fica fora da vista e aparece no pé do cartão ao
 * receber o foco (desvio 12 de ajustes.css).
 */
export function PularPorTeclado() {
  const saida = useSaidaDoCartao();
  return (
    <button type="button" className="m-chip m-pular-teclado" onClick={saida.pular}>
      Pular este passo
    </button>
  );
}

/**
 * O botão de ação do rodapé (`.acao` do mockup): a faísca sobe pelo trilho e o cartão sai para a direita.
 * `semFaisca`: o cartão sai sem faísca (a pergunta que não fecha o passo).
 */
export function BotaoSeguir({
  children,
  semFaisca = false,
}: {
  children: ReactNode;
  semFaisca?: boolean;
}) {
  const saida = useSaidaDoCartao();
  return (
    <button
      type="button"
      className="m-acao"
      onClick={(e) => {
        saida.seguir(semFaisca ? null : e.currentTarget);
      }}
    >
      {children}
      <SetaM />
    </button>
  );
}

/**
 * Um passo sem o que mostrar (a norma sumiu, a matéria não tem leitura): diz isso e deixa seguir. Seguir aqui é
 * pular: o passo não conta como feito (uma porteira sem cartões não vale como passada).
 */
export function PassoSemNada({ texto }: { texto: string }) {
  const saida = useSaidaDoCartao();
  return (
    <>
      <p className="m-quieto">{texto}</p>
      <div className="m-vazio" />
      <div className="m-rodape-cartao">
        <button type="button" className="m-acao" onClick={saida.pular}>
          Seguir
          <SetaM />
        </button>
      </div>
    </>
  );
}

/** Uma saída discreta, em chip, que fecha o passo sem faísca ("Já revisei", "Já adicionei"). */
export function ChipSeguir({ children }: { children: ReactNode }) {
  const saida = useSaidaDoCartao();
  return (
    <button
      type="button"
      className="m-chip"
      style={{ alignSelf: 'flex-start', marginTop: 10 }}
      onClick={() => {
        saida.seguir(null);
      }}
    >
      {children}
    </button>
  );
}
