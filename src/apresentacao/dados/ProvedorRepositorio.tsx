import { useEffect, useState, type ReactNode } from 'react';
import { Repositorio } from '../../core/persistencia';
import { Esqueleto, Falha } from '../componentes/estados';
import { ContextoRepositorio } from './contexto';

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'pronto'; repo: Repositorio }
  | { tipo: 'falha'; excecao: unknown };

const abrirPadrao = () => Repositorio.abrir();

/** Abre o banco local uma vez e o oferece às telas. */
export function ProvedorRepositorio({
  abrir = abrirPadrao,
  children,
}: {
  abrir?: () => Promise<Repositorio>;
  children: ReactNode;
}) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });

  useEffect(() => {
    let ativo = true;
    abrir().then(
      (repo) => {
        if (ativo) setEstado({ tipo: 'pronto', repo });
      },
      (excecao: unknown) => {
        if (ativo) setEstado({ tipo: 'falha', excecao });
      },
    );
    return () => {
      ativo = false;
    };
  }, [abrir]);

  if (estado.tipo === 'carregando') {
    return (
      <main className="conteudo" aria-busy="true">
        <Esqueleto linhas={4} />
      </main>
    );
  }
  if (estado.tipo === 'falha') {
    return (
      <main className="conteudo">
        <Falha
          oQue="Não foi possível abrir os dados deste aparelho."
          oQueFazer="Feche as outras abas do Arretado e recarregue a página. Se o navegador estiver em modo privado, use uma janela normal."
        />
      </main>
    );
  }
  return (
    <ContextoRepositorio.Provider value={estado.repo}>{children}</ContextoRepositorio.Provider>
  );
}
