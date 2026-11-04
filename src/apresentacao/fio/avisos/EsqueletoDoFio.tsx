import './fio-avisos.css';
/**
 * Carregamento com a forma da tela do Fio: o olho, o título e o cartão aparecem como blocos no lugar do
 * conteúdo, então nada pula quando ele chega. Só a opacidade pulsa (e só sem "reduzir movimento").
 */
export function EsqueletoDoFio() {
  return (
    <div className="fio-esqueleto" role="status" aria-label="Carregando">
      <span className="fio-esqueleto-olho" />
      <span className="fio-esqueleto-titulo" />
      <span className="fio-esqueleto-titulo curto" />
      <span className="fio-esqueleto-cartao" />
    </div>
  );
}
