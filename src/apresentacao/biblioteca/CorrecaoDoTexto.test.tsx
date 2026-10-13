import { render, screen } from '@testing-library/react';
import { repositorioDeTeste } from '../../testes/repositorio';
import { ContextoRepositorio } from '../dados/contexto';
import { AvisoDaCorrecao } from './CorrecaoDoTexto';

describe('AvisoDaCorrecao (revisão das etapas 8, 9 e 11)', () => {
  it('sem mudança, não diz que corrigiu nem oferece desfazer', async () => {
    const { repo } = await repositorioDeTeste();
    render(
      <ContextoRepositorio.Provider value={repo}>
        <AvisoDaCorrecao
          resultado={{
            estado: 'sem_mudanca',
            normaId: 'n',
            versaoId: 'v',
            versaoAnteriorId: 'antes',
            alterados: [],
            reancoradas: 0,
            pendentes: 0,
            recuperadas: 0,
          }}
          desfeita={false}
          aoDesfazer={() => undefined}
          aoFechar={() => undefined}
        />
      </ContextoRepositorio.Provider>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Nada mudou: o texto já era este.');
    expect(screen.queryByRole('button', { name: 'Desfazer a correção' })).toBeNull();
  });
});
