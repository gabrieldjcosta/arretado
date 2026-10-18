// Bloco "Agora" do Hoje (pacote A1): uma só ação, com o motivo, e a saída "Escolher outra coisa".
import { useCallback, useState } from 'react';
import type { OrigemDaAcao } from '../../core/modelo';
import type { ProximaAcao } from '../../dominios/hoje/contrato';
import { escolherProximaAcao } from './proxima-acao';
import { hoje } from '../../dominios/recall/servico';
import type { Repositorio } from '../../core/persistencia';
import { AcaoAgora } from '../componentes/AcaoAgora';
import { Esqueleto } from '../componentes/estados';
import { useDados } from '../dados/contexto';
import { rotaDeInicio } from './rota-de-inicio';
import { SessaoAberta } from '../sessao/SessaoAberta';
import { EstadoVazio } from './EstadoVazio';
import './estilos-hoje.css';

/** Título em verbo: a ação primeiro, o motivo logo abaixo. */
function tituloDaAcao(acao: ProximaAcao): string {
  return acao.tipo === 'leitura_salva' ? 'Continuar a leitura' : (acao.alvo.rotulo ?? acao.razao);
}

function ProximaAcaoDoHoje() {
  const [dispensados, setDispensados] = useState<OrigemDaAcao['tipo'][]>([]);
  const carregar = useCallback(
    (repo: Repositorio) => escolherProximaAcao(repo, hoje(repo), { excluir: dispensados }),
    [dispensados],
  );
  const { dados } = useDados(carregar);
  if (dados === undefined) return <Esqueleto linhas={2} />;
  if (dados.tipo === 'vazio') {
    return (
      <EstadoVazio
        comecos={dados.comecos}
        {...(dispensados.length > 0
          ? {
              aoVoltar: () => {
                setDispensados([]);
              },
            }
          : {})}
      />
    );
  }
  const { acao } = dados;
  return (
    <>
      <AcaoAgora
        titulo={tituloDaAcao(acao)}
        motivo={acao.razao}
        {...(acao.estimativaMin === undefined ? {} : { estimativa: acao.estimativaMin })}
        rotuloBotao="Começar"
        para={rotaDeInicio(acao)}
      />
      <button
        type="button"
        className="agora-outra"
        onClick={() => {
          setDispensados((d) => [...d, acao.tipo]);
        }}
      >
        Escolher outra coisa
      </button>
    </>
  );
}

export function Agora() {
  return (
    <>
      <SessaoAberta />
      <ProximaAcaoDoHoje />
    </>
  );
}
