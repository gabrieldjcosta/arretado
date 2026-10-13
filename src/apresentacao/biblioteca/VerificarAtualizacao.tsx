import { useState } from 'react';
import { Link } from 'react-router';
import { sanitizarHtml } from '../../core/seguranca/sanitizador';
import {
  alvoDaVerificacao,
  compararComVersao,
  VerificacaoIndisponivel,
  type ResultadoDaVerificacao,
} from '../../dominios/legislacao/verificacao';
import { buscarPagina, FalhaNaBusca } from '../../integracoes/url/buscar';
import { useRepositorio } from '../dados/contexto';

type Estado =
  | { tipo: 'parado' }
  | { tipo: 'buscando' }
  | { tipo: 'pronto'; resultado: ResultadoDaVerificacao; urlOficial: string }
  | { tipo: 'falha'; mensagem: string };

const FALHA_GERAL = 'Não foi possível verificar agora. A norma continua como está.';

/**
 * 6b (D16): "Verificar atualização" no leitor, só quando a norma tem endereço oficial. Opcional:
 * sem rede só avisa; nunca troca o texto nem cria versão (a decisão é da pessoa).
 */
export function VerificarAtualizacao({ normaId }: { normaId: string }) {
  const repo = useRepositorio();
  const [estado, setEstado] = useState<Estado>({ tipo: 'parado' });

  async function verificar() {
    setEstado({ tipo: 'buscando' });
    try {
      const { versao, urlOficial } = await alvoDaVerificacao(repo, normaId);
      const pagina = await buscarPagina(urlOficial);
      const { blocos } = sanitizarHtml(pagina.html);
      if (blocos.length === 0)
        throw new FalhaNaBusca('A página buscada não tem texto.', 'status_erro');
      setEstado({ tipo: 'pronto', resultado: await compararComVersao(versao, blocos), urlOficial });
    } catch (e) {
      setEstado({
        tipo: 'falha',
        mensagem:
          e instanceof FalhaNaBusca
            ? e.message
            : e instanceof VerificacaoIndisponivel
              ? 'Esta norma não tem endereço oficial guardado.'
              : FALHA_GERAL,
      });
    }
  }

  return (
    <div className="verificar-atualizacao">
      <button
        type="button"
        className="botao-secundario"
        disabled={estado.tipo === 'buscando'}
        onClick={() => void verificar()}
      >
        {estado.tipo === 'buscando' ? 'Verificando…' : 'Verificar atualização'}
      </button>
      <div role="status" aria-live="polite">
        {estado.tipo === 'falha' && <p>{estado.mensagem}</p>}
        {estado.tipo === 'pronto' && <Resultado {...estado} />}
      </div>
    </div>
  );
}

function Resultado({
  resultado,
  urlOficial,
}: {
  resultado: ResultadoDaVerificacao;
  urlOficial: string;
}) {
  if (resultado.tipo === 'igual') {
    return <p>Nenhuma alteração detectada: a página oficial é igual ao texto guardado.</p>;
  }
  if (resultado.tipo === 'sem_indicio') {
    return (
      <p>
        Nenhuma alteração de vigência detectada pela fonte. A página difere do texto guardado, em
        geral só na formatação. O texto da norma não foi mudado.
      </p>
    );
  }
  const { nota, registrada } = resultado;
  return (
    <p>
      Há indício de alteração: a página cita {nota.lei}, de {nota.ano}
      {registrada ? ` (a versão guardada vai até ${registrada.lei}, de ${registrada.ano})` : ''}. O
      texto da norma não foi mudado. Para atualizar, copie a página oficial e{' '}
      <Link to="/biblioteca/importar">importe de novo</Link> ({urlOficial}); você decide o que
      trocar.
    </p>
  );
}
