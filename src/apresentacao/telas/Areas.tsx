import { Link } from 'react-router';
import { Vazio } from '../componentes/estados';
import { useDados } from '../dados/contexto';
import { vencidosHoje } from '../recall/carregadores';

export function Hoje() {
  const { dados: vencidos } = useDados(vencidosHoje);
  return (
    <>
      <h1>Hoje</h1>
      {vencidos !== undefined && vencidos > 0 ? (
        <section className="cartao-bloco" aria-label="Revisões">
          <p>
            {vencidos === 1
              ? '1 cartão para revisar.'
              : `${String(vencidos)} cartões para revisar.`}
          </p>
          <Link to="/recall/revisar" className="botao principal">
            Revisar
          </Link>
        </section>
      ) : (
        <Vazio titulo="Nenhuma revisão hoje">
          <p>O Hoje completo (ponto do dia e fechamento) chega numa próxima fase.</p>
        </Vazio>
      )}
    </>
  );
}

export function Biblioteca() {
  return (
    <>
      <h1>Biblioteca</h1>
      <Vazio titulo="Nenhuma norma ainda">
        <p>A leitura de legislação chega na fase 2.</p>
      </Vazio>
    </>
  );
}

export function NaoEncontrada() {
  return (
    <Vazio titulo="Tela não encontrada" acao={<Link to="/">Ir para o Hoje</Link>}>
      <p>O endereço não corresponde a nenhuma tela do Arretado.</p>
    </Vazio>
  );
}
