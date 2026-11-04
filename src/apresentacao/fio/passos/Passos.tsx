// Os passos Lembrar, Guardar e Praticar (porteira) do Fio, prontos para o cartão do passo: cada um
// recebe o `Passo` do gerador, carrega o que precisa do banco e devolve um `ResultadoDoPasso`.
// Não navegam, não gravam o estado do Fio e não pulam sozinhos: quem hospeda decide (D-D25, "o Fio
// nunca puxa sozinho"). `semente` deve ser estável para o mesmo passo (por exemplo
// `etapa.numero * 100 + posicao`): sair e voltar refaz as mesmas perguntas.
import type { Passo, ResultadoDoPasso } from '../../../dominios/fio';
import {
  CARTOES_DA_PORTEIRA,
  montarGuardar,
  montarLembrar,
  montarPorteira,
} from '../../../dominios/legislacao/lembrar';
import { Esqueleto } from '../../componentes/estados';
import { GuardarDoFio } from './GuardarDoFio';
import { LembrarDoFio } from './LembrarDoFio';
import { PorteiraDoFio } from './PorteiraDoFio';
import { referenciaDe, useCargaDoPasso } from './carregar';

interface PropsDoPasso<T extends Passo['tipo']> {
  passo: Extract<Passo, { tipo: T }>;
  semente: number;
  aoConcluir: (resultado: ResultadoDoPasso) => void;
  /** "Pular" do cartão do passo; também sai de um passo sem o que mostrar. */
  aoPular: () => void;
}

function SemNada({ texto, aoPular }: { texto: string; aoPular: () => void }) {
  return (
    <div className="coluna-drill fio-passo">
      <p>{texto}</p>
      <button type="button" className="principal grande" onClick={aoPular}>
        Seguir
      </button>
    </div>
  );
}

export function LembrarDoPasso({ passo, semente, aoConcluir, aoPular }: PropsDoPasso<'lembrar'>) {
  const chave = `lembrar|${passo.normaId}|${passo.artigos.map((a) => a.endereco).join(',')}|${String(semente)}`;
  const carga = useCargaDoPasso(chave, (repo) =>
    montarLembrar(repo, { normaId: passo.normaId, artigos: passo.artigos }, referenciaDe, semente),
  );
  if (carga.estado === 'carregando') return <Esqueleto />;
  if (carga.estado === 'falhou' || carga.dados.length === 0) {
    return <SemNada texto="Nada para lembrar neste passo." aoPular={aoPular} />;
  }
  return (
    <LembrarDoFio
      perguntas={carga.dados}
      aoConcluir={({ acertos, erros }) => {
        aoConcluir({ tipo: 'lembrar', acertos, erros });
      }}
    />
  );
}

export function GuardarDoPasso({ passo, semente, aoConcluir, aoPular }: PropsDoPasso<'guardar'>) {
  const chave = `guardar|${passo.normaId}|${passo.enderecos.join(',')}|${String(semente)}`;
  const carga = useCargaDoPasso(chave, (repo) =>
    montarGuardar(
      repo,
      { normaId: passo.normaId, enderecos: passo.enderecos },
      referenciaDe,
      semente,
    ),
  );
  if (carga.estado === 'carregando') return <Esqueleto />;
  if (carga.estado === 'falhou' || carga.dados.length === 0) {
    return <SemNada texto="Nada para guardar neste passo." aoPular={aoPular} />;
  }
  return (
    <GuardarDoFio
      itens={carga.dados}
      aoConcluir={({ guardadas }) => {
        aoConcluir({ tipo: 'guardar', guardadas });
      }}
    />
  );
}

/** Onde a porteira busca os cartões: os artigos lidos da matéria, escolhidos por quem hospeda. */
export interface AlvoDaPorteira {
  normaId: string;
  artigos: readonly { endereco: string; rotulo: string }[];
}

/**
 * Praticar em modo `porteira`. O modo `ache_o_erro` é a tela do piloto (`/recall/ache-o-erro`):
 * quem hospeda a abre ou pula o passo; aqui ele cai no "nada para praticar".
 */
export function PraticarDoPasso({
  passo,
  alvo,
  semente,
  aoConcluir,
  aoPular,
}: PropsDoPasso<'praticar'> & { alvo: AlvoDaPorteira }) {
  const porteira = passo.modo === 'porteira';
  const chave = `praticar|${passo.modo}|${alvo.normaId}|${alvo.artigos.map((a) => a.endereco).join(',')}|${String(semente)}`;
  const carga = useCargaDoPasso(chave, (repo) =>
    porteira
      ? montarPorteira(
          repo,
          alvo,
          referenciaDe,
          semente,
          Math.min(passo.quantidade, CARTOES_DA_PORTEIRA),
        )
      : Promise.resolve([]),
  );
  if (carga.estado === 'carregando') return <Esqueleto />;
  if (carga.estado === 'falhou' || carga.dados.length === 0) {
    return <SemNada texto="Nada para praticar aqui." aoPular={aoPular} />;
  }
  return (
    <PorteiraDoFio
      cartoes={carga.dados}
      aoConcluir={({ acertos, total }) => {
        aoConcluir({ tipo: 'praticar', acertos, total });
      }}
    />
  );
}
