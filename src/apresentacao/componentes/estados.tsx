import type { ReactNode } from 'react';
import { useConectado } from './conexao';

/**
 * Estado vazio: um convite (o que é este espaço) e a ação que o preenche (Parte 2 §9.1). A `marca`,
 * se houver, é o desenho decorativo acima do título (o fim de uma rodada de revisão).
 */
export function Vazio({
  titulo,
  children,
  acao,
  marca,
}: {
  titulo: string;
  children?: ReactNode;
  acao?: ReactNode;
  marca?: ReactNode;
}) {
  return (
    <section className="vazio">
      {marca}
      <h2>{titulo}</h2>
      {children}
      {acao && <div className="linha-acoes">{acao}</div>}
    </section>
  );
}

/** Carregando: esqueleto, sem spinner solto. */
export function Esqueleto({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="esqueleto" role="status" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

/** Falha: o que falhou, o que fazer, e que nada foi perdido. */
export function Falha({ oQue, oQueFazer }: { oQue: string; oQueFazer: string }) {
  return (
    <div className="aviso falha" role="alert">
      <p>
        <strong>{oQue}</strong>
      </p>
      <p>{oQueFazer}</p>
      <p>Nada foi perdido: seus dados continuam neste aparelho.</p>
    </div>
  );
}

/** Faixa fina quando sem rede: tudo continua funcionando (D1). */
export function FaixaOffline() {
  const conectado = useConectado();
  if (conectado) return null;
  return (
    <div className="faixa-offline" role="status">
      Sem conexão. Tudo continua funcionando.
    </div>
  );
}
