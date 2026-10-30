// Liga a sincronização (F4-B) ao app: com conta e aceite `v4:sincronizar`, o envio e a recepção
// rodam sozinhos e a posse de aparelho (D17) é pedida e renovada. Tudo dormente sem conta ou sem
// aceite. O estado que as telas mostram (os três estados, posse, Conflitos, Problemas) mora aqui.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { registrarConsentimento, temConsentimento } from '../../core/preferencias';
import { pessoaDesligou, registrarDesligada } from './desligada';
import {
  contarConflitos,
  contarPendentes,
  criarPosse,
  iniciarSincronizacao,
  lerQuarentenaDeRecebidos,
  sincroniza,
  type EstadoDePosse,
  type Posse,
  type ResultadoDaRodada,
  type Sincronizacao,
} from '../../core/sincronizacao';
import { reidratadorDoAcervo } from '../../dominios/acervo/adesao';
import { VERSAO_POLITICA_SINCRONIZACAO } from '../../core/preferencias/consentimento';
import { useServicoDeConta } from '../conta/entrar/ContextoConta';
import { useRepositorio } from '../dados/contexto';
import { useFonteAcervo } from '../dados/fonteAcervoContexto';
import {
  ContextoSincronizacao,
  type ControleDeSincronizacao,
  type EstadoDaTelaDeSincronizacao,
} from './contexto';
import { motivoDaTrava } from './rotulos';

const INICIAL: EstadoDaTelaDeSincronizacao = {
  ligada: null,
  parada: null,
  pendentes: 0,
  conflitos: 0,
  emQuarentena: 0,
  ultimaRodada: null,
  posse: { tipo: 'parada' },
  bloqueioEm: null,
};

/** Quanto a descarga do pendente pode atrasar a cessão da posse (plano §4). */
const TETO_ANTES_DE_PERDER_MS = 5_000;

/** Texto curto para a tela, sem a mensagem técnica (Dexie, zod, HTTP); o detalhe vai ao console. */
function textoDaFalha(falha: unknown): string {
  console.warn('Problema na sincronização:', falha);
  if (falha instanceof TypeError) return 'o servidor não respondeu (sem conexão ou fora do ar)';
  return 'o servidor recusou ou o app não conseguiu aplicar a resposta';
}

export function ProvedorSincronizacao({
  children,
  renovacaoMs,
  intervaloDePuxadaMs,
}: {
  children: ReactNode;
  /** Só para testes e E2E: ritmo da renovação de posse. */
  renovacaoMs?: number;
  intervaloDePuxadaMs?: number;
}) {
  const repo = useRepositorio();
  const servico = useServicoDeConta();
  const fonteAcervo = useFonteAcervo();
  const [estado, setEstado] = useState(INICIAL);
  const controle = useRef<{ sync: Sincronizacao; posse: Posse } | null>(null);
  const [geracao, setGeracao] = useState(0);

  const medir = useCallback(async () => {
    const [pendentes, conflitos, quarentena] = await Promise.all([
      contarPendentes(repo.db, repo.ctx.usuarioId, repo.ctx.aparelhoId),
      contarConflitos(repo.db),
      lerQuarentenaDeRecebidos(repo),
    ]);
    setEstado((e) => ({ ...e, pendentes, conflitos, emQuarentena: quarentena.length }));
  }, [repo]);

  useEffect(() => {
    const vida = { viva: true };
    // Lido por função: o TypeScript não enxerga a limpeza mudando o campo entre os `await`.
    const vivo = () => vida.viva;
    let cancelarEventos = () => {};
    let timerMedida: ReturnType<typeof setTimeout> | null = null;
    const aplicarTrava = (posse: EstadoDePosse) => {
      // O que nunca sai deste aparelho (tema, letra, coleções só locais) não espera a posse.
      repo.bloquearEscrita(motivoDaTrava(posse, navigator.onLine), {
        isenta: (e) => !sincroniza(e),
        aoBloquear: () => {
          if (vivo()) setEstado((e) => ({ ...e, bloqueioEm: Date.now() }));
        },
      });
    };
    const aoMudarRede = () => {
      aplicarTrava(controle.current?.posse.estado() ?? { tipo: 'parada' });
    };

    void (async () => {
      const sessao = await servico.sessao();
      if (!vivo()) return;
      if (!sessao) {
        setEstado({ ...INICIAL, ligada: false, parada: 'sem-conta' });
        return;
      }
      const desligada = pessoaDesligou(repo.ctx.usuarioId);
      if (!desligada && !(await temConsentimento(repo, 'sincronizar'))) {
        // Padrão de quem entrou (o aviso do login já diz que o estudo vai para a conta): tenta ligar
        // sozinho. Ter sessão basta, porque entrar exige o aceite; o aceite do login só é gravado
        // no banco da conta depois, então checá-lo aqui perderia a corrida. Sem conta liberada ou sem
        // rede, fica como estava e a tela Sincronização oferece.
        try {
          await servico.aceitarSincronizacao(`${VERSAO_POLITICA_SINCRONIZACAO}:sincronizar`);
          await registrarConsentimento(repo, 'sincronizar');
        } catch {
          // Segue para o estado parado abaixo.
        }
      }
      if (desligada || !(await temConsentimento(repo, 'sincronizar'))) {
        if (vivo()) setEstado({ ...INICIAL, ligada: false, parada: 'sem-aceite' });
        return;
      }
      if (!vivo()) return;
      const servidor = servico.servidorDeSincronizacao();
      const sync = await iniciarSincronizacao({
        repo,
        servidor,
        usuarioId: repo.ctx.usuarioId,
        intervaloDePuxadaMs,
        prepararReidratacao: (log) => reidratadorDoAcervo(fonteAcervo, log),
        aoRodada: (r: ResultadoDaRodada) => {
          if (!vivo()) return;
          const em = new Date().toISOString();
          setEstado((e) => ({
            ...e,
            ultimaRodada: r.ok ? { ok: true, em } : { ok: false, em, falha: textoDaFalha(r.falha) },
          }));
          void medir();
        },
      });
      if (!vivo()) {
        sync.parar();
        return;
      }
      const posse = criarPosse({
        servidor,
        aparelhoId: repo.ctx.aparelhoId,
        renovacaoMs,
        aoMudar: (p) => {
          aplicarTrava(p);
          if (vivo()) setEstado((e) => ({ ...e, posse: p }));
        },
        // Antes de ceder a posse, sobe o que ficou pendente (plano §4): espera a rodada, com teto.
        antesDePerder: () =>
          Promise.race([
            sync.rodadaAgora(),
            new Promise<void>((resolver) => setTimeout(resolver, TETO_ANTES_DE_PERDER_MS)),
          ]),
      });
      controle.current = { sync, posse };
      setEstado((e) => ({ ...e, ligada: true, parada: null }));
      void posse.pedir();
      void medir();
      window.addEventListener('online', aoMudarRede);
      window.addEventListener('offline', aoMudarRede);
      // Gravações mudam o "Salvo neste aparelho"; junta as próximas antes de contar.
      cancelarEventos = repo.eventos.assinar('*', () => {
        if (timerMedida !== null) return;
        timerMedida = setTimeout(() => {
          timerMedida = null;
          void medir();
        }, 300);
      });
    })();

    return () => {
      vida.viva = false;
      cancelarEventos();
      if (timerMedida !== null) clearTimeout(timerMedida);
      window.removeEventListener('online', aoMudarRede);
      window.removeEventListener('offline', aoMudarRede);
      controle.current?.sync.parar();
      controle.current?.posse.parar();
      controle.current = null;
      repo.bloquearEscrita(null);
    };
  }, [repo, servico, fonteAcervo, medir, renovacaoMs, intervaloDePuxadaMs, geracao]);

  const valor = useMemo<ControleDeSincronizacao>(
    () => ({
      estado,
      sincronizarAgora: () => {
        controle.current?.sync.pedir(true);
        void controle.current?.posse.pedir();
      },
      ligar: async () => {
        // Servidor primeiro: sem conta liberada ele recusa e nada fica marcado aqui.
        await servico.aceitarSincronizacao(`${VERSAO_POLITICA_SINCRONIZACAO}:sincronizar`);
        await registrarConsentimento(repo, 'sincronizar');
        registrarDesligada(repo.ctx.usuarioId, false);
        setGeracao((g) => g + 1);
      },
      desligar: () => {
        registrarDesligada(repo.ctx.usuarioId, true);
        setGeracao((g) => g + 1);
      },
      editarAqui: async () => {
        await controle.current?.posse.pedir(true);
      },
    }),
    [estado, repo, servico],
  );

  return <ContextoSincronizacao.Provider value={valor}>{children}</ContextoSincronizacao.Provider>;
}
