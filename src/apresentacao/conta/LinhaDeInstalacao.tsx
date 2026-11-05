import { useInstalacao } from '../../suporte/instalacao';

const TEXTO = {
  titulo: 'Instalar no aparelho',
  apoio: 'Abre em janela própria e funciona sem internet.',
  acao: 'Instalar',
  apoioIos: 'No Safari, toque em Compartilhar e depois em "Adicionar à Tela de Início".',
} as const;

/** Convite para instalar a PWA (Android, Windows) ou o passo a passo (iOS). Some onde não se aplica. */
export function LinhaDeInstalacao() {
  const { estado, instalar } = useInstalacao();
  if (estado !== 'convite' && estado !== 'passo-a-passo-ios') return null;
  return (
    <li>
      <div className="linha-do-passeio">
        <span className="linha-do-passeio-texto">
          <span className="linha-lista-titulo">{TEXTO.titulo}</span>
          <span className="linha-do-passeio-apoio">
            {estado === 'convite' ? TEXTO.apoio : TEXTO.apoioIos}
          </span>
        </span>
        {estado === 'convite' && (
          <button
            type="button"
            className="botao"
            onClick={() => {
              void instalar();
            }}
          >
            {TEXTO.acao}
          </button>
        )}
      </div>
    </li>
  );
}
