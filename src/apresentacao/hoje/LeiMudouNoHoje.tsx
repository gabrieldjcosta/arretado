// "A lei mudou" no Hoje (AP-05): uma linha por norma da Biblioteca cujo texto mudou. Duas fontes:
// o texto mudou onde a pessoa guardou algo (leva à norma, onde estão o antes e o agora) e o acervo
// ganhou versão nova de uma norma que ela tem (leva ao acervo, onde a prévia e o "Atualizar" moram).
// Sem rede, só a primeira fonte aparece. Não entra no Agora nem na contagem do Dia, e o texto não cobra nada.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { itensComVersaoNova } from '../../dominios/acervo/atualizacao';
import { avisosDeLeiMudou } from '../../dominios/acervo/pendencias';
import { linhasDaLeiQueMudou } from '../componentes/lei-mudou';
import { useDados } from '../dados/contexto';
import { useFonteAcervo } from '../dados/fonteAcervoContexto';

const LINHAS_A_VISTA = 3;

export function LeiMudouNoHoje() {
  const fonte = useFonteAcervo();
  const { dados: avisos } = useDados(avisosDeLeiMudou);
  const [indice, setIndice] = useState<Awaited<ReturnType<typeof fonte.listar>> | null>(null);
  const [todas, setTodas] = useState(false);
  useEffect(() => {
    let ativo = true;
    fonte.listar().then(
      (i) => {
        if (ativo) setIndice(i);
      },
      () => undefined,
    );
    return () => {
      ativo = false;
    };
  }, [fonte]);
  const carregarNovas = useCallback(
    async (repo: Parameters<typeof itensComVersaoNova>[0]) =>
      indice ? itensComVersaoNova(repo, indice.itens) : [],
    [indice],
  );
  const { dados: novas } = useDados(carregarNovas);

  const linhas = linhasDaLeiQueMudou(avisos ?? [], novas ?? []);
  if (linhas.length === 0) return null;
  const visiveis = todas ? linhas : linhas.slice(0, LINHAS_A_VISTA);
  return (
    <section className="aviso lei-mudou-no-hoje" aria-label="A lei mudou">
      <h2>A lei mudou</h2>
      <ul className="lista-simples">
        {visiveis.map((l) => (
          <li key={l.chave}>
            <span>{l.texto}</span>
            <Link to={l.para} className="botao" aria-label={l.aria}>
              {l.rotulo}
            </Link>
          </li>
        ))}
      </ul>
      {linhas.length > LINHAS_A_VISTA && (
        <button
          type="button"
          className="discreto"
          aria-expanded={todas}
          onClick={() => {
            setTodas(!todas);
          }}
        >
          {todas ? 'Ver menos' : `Ver todas (${linhas.length})`}
        </button>
      )}
    </section>
  );
}
