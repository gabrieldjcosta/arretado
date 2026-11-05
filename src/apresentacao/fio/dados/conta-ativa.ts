// Quem está com a conta aberta neste aparelho (o registro de contas do aparelho, T26), para o cacto da marca e para a folha
// da Conta do Fio. Sem a chave de contas no build, ninguém: `null` na hora. `undefined` = ainda lendo.
import { useEffect, useState } from 'react';
import { RegistroDeContas } from '../../../core/persistencia';
import { contasHabilitadas } from '../../../integracoes/conta';

export interface ContaAtiva {
  email: string | undefined;
}

export function useContaAtiva(ativo = true): ContaAtiva | null | undefined {
  const [conta, setConta] = useState<ContaAtiva | null | undefined>(
    contasHabilitadas() ? undefined : null,
  );
  useEffect(() => {
    if (!ativo || !contasHabilitadas()) return;
    let vivo = true;
    new RegistroDeContas().contaAtiva().then(
      (c) => {
        if (vivo) setConta(c ? { email: c.email } : null);
      },
      () => {
        if (vivo) setConta(null);
      },
    );
    return () => {
      vivo = false;
    };
  }, [ativo]);
  return conta;
}
