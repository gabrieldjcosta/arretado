import { Link } from 'react-router';
import { Vazio } from '../componentes/estados';

export function Hoje() {
  return (
    <>
      <h1>Hoje</h1>
      <Vazio titulo="Nada para hoje ainda">
        <p>O Hoje vai reunir revisões, ponto do dia e fechamento. Ele chega depois do Recall.</p>
      </Vazio>
    </>
  );
}

export function Plano() {
  return (
    <>
      <h1>Plano</h1>
      <Vazio titulo="Nenhum ponto do edital ainda">
        <p>Os pontos do edital poderão ser importados em breve.</p>
      </Vazio>
    </>
  );
}

export function Recall() {
  return (
    <>
      <h1>Recall</h1>
      <Vazio titulo="Nenhum erro registrado">
        <p>O registro de erros e as revisões chegam na próxima etapa.</p>
      </Vazio>
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
