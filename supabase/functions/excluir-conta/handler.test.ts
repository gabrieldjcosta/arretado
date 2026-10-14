import { excluirConta, type DependenciasDeExclusao } from './handler';

const ORIGEM = 'https://arretado.gabrieldjcosta.workers.dev';
const UID = '77777777-7777-4777-8777-777777777777';

function dependencias(sobrescritas: Partial<DependenciasDeExclusao> = {}) {
  const chamadas: string[] = [];
  const deps: DependenciasDeExclusao = {
    usuarioDoToken: (t) => {
      chamadas.push('token');
      return Promise.resolve(t === 'bom' ? { id: UID } : null);
    },
    listarObjetos: () => {
      chamadas.push('listar');
      return Promise.resolve([`${UID}/a.arretado`, `${UID}/b.arretado`]);
    },
    apagarObjetos: (c) => {
      chamadas.push(`apagarObjetos:${String(c.length)}`);
      return Promise.resolve();
    },
    registrarExclusao: (t) => {
      chamadas.push(`registrar:${String(t)}`);
      return Promise.resolve();
    },
    apagarUsuario: (id) => {
      chamadas.push(`apagarUsuario:${id}`);
      return Promise.resolve();
    },
    ...sobrescritas,
  };
  return { deps, chamadas };
}

const pedido = (extra: Partial<Parameters<typeof excluirConta>[0]> = {}) => ({
  metodo: 'POST',
  origem: ORIGEM,
  autorizacao: 'Bearer bom',
  ...extra,
});

describe('excluir-conta (F4-A, A5)', () => {
  it('apaga objetos, registra a contagem e só então apaga o usuário', async () => {
    const { deps, chamadas } = dependencias();
    const r = await excluirConta(pedido(), deps);
    expect(r.status).toBe(200);
    expect(chamadas).toEqual([
      'token',
      'listar',
      'apagarObjetos:2',
      'registrar:true',
      `apagarUsuario:${UID}`,
    ]);
    expect(r.cabecalhos['Access-Control-Allow-Origin']).toBe(ORIGEM);
  });

  it('sem objetos pula a remoção e registra "sem cópia"', async () => {
    const { deps, chamadas } = dependencias({ listarObjetos: () => Promise.resolve([]) });
    expect((await excluirConta(pedido(), deps)).status).toBe(200);
    expect(chamadas).toContain('registrar:false');
    expect(chamadas.some((c) => c.startsWith('apagarObjetos'))).toBe(false);
  });

  it('token ausente ou inválido: 401 e nada é apagado', async () => {
    for (const autorizacao of [null, 'Bearer ruim', 'Basic x']) {
      const { deps, chamadas } = dependencias();
      expect((await excluirConta(pedido({ autorizacao }), deps)).status).toBe(401);
      expect(chamadas.some((c) => c.startsWith('apagar'))).toBe(false);
    }
  });

  it('origem fora da lista ou método errado são recusados antes de olhar o token', async () => {
    const { deps, chamadas } = dependencias();
    expect((await excluirConta(pedido({ origem: 'https://outro.exemplo' }), deps)).status).toBe(
      403,
    );
    expect((await excluirConta(pedido({ metodo: 'GET' }), deps)).status).toBe(405);
    expect(chamadas).toEqual([]);
  });

  it('OPTIONS responde ao preflight só para origem permitida', async () => {
    const { deps } = dependencias();
    const ok = await excluirConta(pedido({ metodo: 'OPTIONS' }), deps);
    expect(ok.status).toBe(204);
    expect(ok.cabecalhos['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
    const fora = await excluirConta(
      pedido({ metodo: 'OPTIONS', origem: 'https://x.exemplo' }),
      deps,
    );
    expect(fora.cabecalhos['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('falha ao apagar objetos: 500 e o usuário NÃO é apagado (dá para repetir)', async () => {
    const { deps, chamadas } = dependencias({
      apagarObjetos: () => Promise.reject(new Error('storage fora')),
    });
    expect((await excluirConta(pedido(), deps)).status).toBe(500);
    expect(chamadas.some((c) => c.startsWith('apagarUsuario'))).toBe(false);
  });

  it('falha só no registro da contagem não impede a exclusão (direito do titular)', async () => {
    const { deps, chamadas } = dependencias({
      registrarExclusao: () => Promise.reject(new Error('tabela fora')),
    });
    expect((await excluirConta(pedido(), deps)).status).toBe(200);
    expect(chamadas).toContain(`apagarUsuario:${UID}`);
  });
});
