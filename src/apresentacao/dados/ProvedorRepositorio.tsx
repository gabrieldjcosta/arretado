import { useEffect, useState, type ReactNode } from 'react';
import {
  abrirRepositorioAtivo,
  type MotivoFechamento,
  type Repositorio,
} from '../../core/persistencia';
import { contasHabilitadas } from '../../integracoes/conta';
import { registrarAceitePendente } from '../conta/entrar/aceite';
import { Esqueleto, Falha } from '../componentes/estados';
import { ContextoRepositorio } from './contexto';

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'pronto'; repo: Repositorio }
  | { tipo: 'falha'; excecao: unknown }
  /** Outra aba subiu o esquema (versão nova do app) ou apagou os dados. */
  | { tipo: 'fechadoPorOutraAba'; motivo: MotivoFechamento };

const abrirPadrao = () => abrirRepositorioAtivo({ contasHabilitadas: contasHabilitadas() });

/** Abre o banco local uma vez e o oferece às telas. */
export function ProvedorRepositorio({
  abrir = abrirPadrao,
  registro,
  children,
}: {
  abrir?: () => Promise<Repositorio>;
  /** Só para testes: o registro de contas onde está a conta ativa. */
  registro?: Parameters<typeof registrarAceitePendente>[1];
  children: ReactNode;
}) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });

  useEffect(() => {
    let ativo = true;
    let desinscrever = () => {};
    abrir().then(
      (repo) => {
        if (!ativo) return;
        desinscrever = repo.db.aoFecharPorOutraAba((motivo) => {
          setEstado({ tipo: 'fechadoPorOutraAba', motivo });
        });
        setEstado({ tipo: 'pronto', repo });
        // O aceite do login vira Usuario.consentimentos assim que o banco da conta abre, sem esperar
        // a pessoa abrir Conta. Idempotente; se falhar, a marca fica e a abertura segue.
        if (contasHabilitadas())
          void registrarAceitePendente(repo, registro).catch(() => undefined);
      },
      (excecao: unknown) => {
        if (ativo) setEstado({ tipo: 'falha', excecao });
      },
    );
    return () => {
      ativo = false;
      desinscrever();
    };
  }, [abrir, registro]);

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
  if (estado.tipo === 'fechadoPorOutraAba') {
    return (
      <main className="conteudo">
        {estado.motivo === 'versao' ? (
          <Falha
            oQue="O Arretado foi atualizado em outra aba."
            oQueFazer="Recarregue esta página para usar a versão nova."
          />
        ) : (
          <div className="aviso falha" role="alert">
            <p>
              <strong>Os dados deste aparelho foram apagados em outra aba.</strong>
            </p>
            <p>Recarregue esta página para começar de novo.</p>
          </div>
        )}
      </main>
    );
  }
  return (
    <ContextoRepositorio.Provider value={estado.repo}>{children}</ContextoRepositorio.Provider>
  );
}
