import { escolherInterface, useInterface } from './interface';

/**
 * A linha da Conta que liga e desliga o Arretado novo (a prévia do Fio, D-D25). Desligada por padrão:
 * nada muda para quem não toca nela, e o botão desfaz a qualquer hora, sem perder dado.
 */
export function LinhaDaPrevia() {
  const ligada = useInterface() === 'fio';
  return (
    <div className="linha-do-passeio">
      <span className="linha-do-passeio-texto">
        <span className="linha-lista-titulo">Arretado novo (prévia)</span>
        <span className="linha-do-passeio-apoio">
          {ligada
            ? 'Você está vendo a cara nova: o fio, o destino e o varal.'
            : 'O fio que se puxa, o destino e o varal no lugar das abas.'}
        </span>
      </span>
      <button
        type="button"
        className="botao"
        onClick={() => {
          escolherInterface(ligada ? 'atual' : 'fio');
        }}
      >
        {ligada ? 'Voltar ao de sempre' : 'Experimentar'}
      </button>
    </div>
  );
}
