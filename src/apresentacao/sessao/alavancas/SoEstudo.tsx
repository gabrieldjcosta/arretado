// Modo "só estudo" (A3a): esconde a administração (áreas, Conta, botão de erro flutuante, rodapé)
// enquanto a Sessão está na tela. O interruptor continua visível; é a preferência `modoSoEstudo`.
import { useCallback, useEffect } from 'react';
import { alterarPreferencias, obterPreferencias } from '../../../core/preferencias';
import { useDados, useRepositorio } from '../../dados/contexto';
import './estilos-alavancas.css';

export function SoEstudo() {
  const repo = useRepositorio();
  const { dados } = useDados(useCallback((r) => obterPreferencias(r), []));
  const ligado = dados?.modoSoEstudo === true;
  useEffect(() => {
    if (!ligado) return;
    document.body.dataset.soEstudo = 'true';
    return () => {
      delete document.body.dataset.soEstudo;
    };
  }, [ligado]);
  if (!dados) return null;
  return (
    <div className="alavanca so-estudo">
      <label className="so-estudo-rotulo">
        <input
          type="checkbox"
          checked={ligado}
          onChange={(e) => {
            void alterarPreferencias(repo, { modoSoEstudo: e.target.checked });
          }}
        />
        Só estudo
      </label>
      <p className="dica">
        Esconde o resto do app enquanto você estuda. Desligue aqui quando quiser.
      </p>
    </div>
  );
}
