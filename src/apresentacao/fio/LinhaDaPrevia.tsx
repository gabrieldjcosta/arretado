import { escolherInterface, useInterface } from './interface';

/**
 * A linha da Conta que liga e desliga o Arretado novo (a prévia do Fio, D-D25). Ligada por padrão; o botão
 * volta à interface de antes e de lá de novo, a qualquer hora, sem perder dado.
 */
export function LinhaDaPrevia() {
  const ligada = useInterface() === 'fio';
  return (
    <div className="linha-do-passeio">
      <span className="linha-do-passeio-texto">
        <span className="linha-lista-titulo">Arretado novo</span>
        <span className="linha-do-passeio-apoio">
          {ligada
            ? 'Você está na cara nova: o fio, o destino e o varal.'
            : 'Volte à cara nova: o fio, o destino e o varal no lugar das abas.'}
        </span>
      </span>
      <button
        type="button"
        className="botao"
        onClick={() => {
          escolherInterface(ligada ? 'atual' : 'fio');
        }}
      >
        {ligada ? 'Voltar ao de sempre' : 'Voltar à cara nova'}
      </button>
    </div>
  );
}
