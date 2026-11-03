// Puxa as normas essenciais em segundo plano (Gabriel, 02/11/2026). Silencioso: sem aviso, sem
// bloqueio. Roda uma vez por Aparelho, depois de uns segundos de calma, só com rede e sem
// "economia de dados"; se alguma falhar, tenta de novo na próxima abertura.
import { useEffect } from 'react';
import { puxarEssenciais } from '../../dominios/acervo/essenciais';
import { useFonteAcervo } from '../dados/fonteAcervoContexto';
import { useRepositorio } from '../dados/contexto';

const CHAVE = 'arretado.essenciais.v1';
const ESPERA_MS = 5000;

function jaFeito(): boolean {
  try {
    return localStorage.getItem(CHAVE) === '1';
  } catch {
    return false;
  }
}

function marcarFeito(): void {
  try {
    localStorage.setItem(CHAVE, '1');
  } catch {
    /* sem armazenamento: tenta de novo na próxima abertura, e o que já entrou não se repete */
  }
}

/** Sem rede, com economia de dados ou em conexão muito lenta, fica para outra hora. */
function conexaoPermite(): boolean {
  if (typeof navigator === 'undefined' || !navigator.onLine) return false;
  const c = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  return !(c?.saveData === true || c?.effectiveType === 'slow-2g' || c?.effectiveType === '2g');
}

/** Desligado nos testes automáticos de interface, que contam as normas da Biblioteca. */
const AUTOMATICO =
  import.meta.env.MODE !== 'test' && typeof navigator !== 'undefined' && !navigator.webdriver;

export function PuxarEssenciais({
  ativo = AUTOMATICO,
  ids,
  espera = ESPERA_MS,
}: {
  ativo?: boolean;
  ids?: readonly string[];
  espera?: number;
}) {
  const repo = useRepositorio();
  const fonte = useFonteAcervo();
  useEffect(() => {
    if (!ativo || jaFeito()) return;
    let parar = false;
    const t = window.setTimeout(() => {
      if (!conexaoPermite()) return;
      puxarEssenciais(repo, fonte, { ...(ids ? { ids } : {}), deveParar: () => parar }).then(
        (r) => {
          if (r.pendentes === 0) marcarFeito();
        },
        () => undefined,
      );
    }, espera);
    return () => {
      parar = true;
      window.clearTimeout(t);
    };
  }, [ativo, ids, espera, repo, fonte]);
  return null;
}
