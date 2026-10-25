// PendenciaDeReleitura.tipo 'texto_alterado' (AP-05): valor novo no tipo, sem subir a versão do
// esquema nem a do formato. A pendência antiga segue restaurável; ida e volta preserva a nova.
import { Repositorio } from '../persistencia';
import { exportarPacote } from './exportar';
import { aplicar, planejar } from './importar';
import { lerPacote } from './ler';

const nomeBanco = () => `texto-alterado-${Math.random().toString(36).slice(2)}`;

describe("PendenciaDeReleitura 'texto_alterado' no pacote (AP-05)", () => {
  it('ida e volta no modo 6 preserva os dois tipos de pendência', async () => {
    const origem = await Repositorio.abrir({ nomeBanco: nomeBanco() });
    const base = { normaId: crypto.randomUUID(), versaoId: crypto.randomUUID() };
    await origem.colecao('pendenciasReleitura').criar({
      ...base,
      tipo: 'estrela',
      enderecoAntigo: 'art4',
    });
    await origem.colecao('pendenciasReleitura').criar({
      ...base,
      tipo: 'texto_alterado',
      enderecoAntigo: 'art180',
      referenciaId: crypto.randomUUID(),
    });
    const { bytes } = await exportarPacote(origem);
    const destino = await Repositorio.abrir({ nomeBanco: nomeBanco() });
    const lido = await lerPacote(bytes);
    const r = await aplicar(destino, lido, await planejar(destino, lido, { modo: 6 }));
    const tipos = (await r.repo.colecao('pendenciasReleitura').todosDoUsuario())
      .map((p) => p.tipo)
      .sort();
    expect(tipos).toEqual(['estrela', 'texto_alterado']);
  });
});
