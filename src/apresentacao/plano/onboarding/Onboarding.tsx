// `/plano/onboarding` (pacote B2): da carreira ao "Comece por aqui", uma pergunta por tela, tudo
// reversível (os pontos entram pelo mesmo caminho da importação: prévia, snapshot, log e desfazer).
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { Ponto } from '../../../core/modelo';
import { aplicar } from '../../../core/pacote';
import {
  CatalogoIndisponivel,
  chaveDeNome,
  disciplinasDoEdital,
  editaisOferecidos,
  FonteEmbutida,
  type CarreiraDoCatalogo,
  type FonteDoCatalogo,
  type IndiceDoCatalogo,
} from '../../../dominios/catalogo';
import { linhasDoEdital } from '../../../integracoes/catalogo/linhas';
import { prepararPontos, type PontosPreparados } from '../../../integracoes/pontos/importar';
import { PreviaImportacao } from '../../conta/dados/PreviaImportacao';
import { AcaoAgora } from '../../componentes/AcaoAgora';
import { Esqueleto, Falha, Vazio } from '../../componentes/estados';
import { useRepositorio } from '../../dados/contexto';
import { rotaDeInicio } from '../../hoje/rota-de-inicio';
import { Moldura, PassoCarreira, PassoDisciplinas, PassoEdital } from './Passos';
import { gravarRascunho, lerRascunho, limparRascunho, type Passo, type Rascunho } from './rascunho';

const ORDEM: readonly Passo[] = ['carreira', 'edital', 'disciplinas', 'revisar'];
const TITULOS: Record<Passo, string> = {
  carreira: 'Para qual carreira você estuda?',
  edital: 'Qual edital serve de base?',
  disciplinas: 'Quais matérias entram no plano?',
  revisar: 'Confira antes de criar',
};

const alternar = (lista: readonly string[], chave: string) =>
  lista.includes(chave) ? lista.filter((c) => c !== chave) : [...lista, chave];

function SemEdital() {
  return (
    <Vazio titulo="Tudo bem começar sem edital">
      <p>Dá para montar o plano depois. Escolha um começo:</p>
      <ul className="comecos">
        <li>
          <Link to="/biblioteca/importar" className="botao principal">
            Adicionar uma lei para ler
          </Link>
        </li>
        <li>
          <Link to="/plano" className="botao">
            Importar minha planilha de pontos
          </Link>
        </li>
        <li>
          <Link to="/sessao/iniciar" className="botao">
            Começar uma sessão curta
          </Link>
        </li>
      </ul>
    </Vazio>
  );
}

function ComecePorAqui({ ponto }: { ponto?: Ponto }) {
  return (
    <>
      {ponto ? (
        <AcaoAgora
          titulo={`Comece por aqui: ${ponto.titulo}`}
          rotuloBotao="Começar"
          para={rotaDeInicio({
            tipo: 'escolha_propria',
            razao: 'Primeiro ponto do seu plano',
            alvo: { tipo: 'ponto', id: ponto.id, rotulo: ponto.titulo.slice(0, 200) },
          })}
        />
      ) : (
        <Vazio titulo="Plano criado" />
      )}
      <p className="dica">
        Para desfazer, use Conta › Dados › Importações. Em <Link to="/plano">Plano</Link> estão
        todos os pontos.
      </p>
    </>
  );
}

export function Onboarding({ fonte }: { fonte?: FonteDoCatalogo }) {
  const repo = useRepositorio();
  const origem = useMemo(() => fonte ?? new FonteEmbutida(), [fonte]);
  const [rascunho, setRascunho] = useState<Rascunho>(lerRascunho);
  const [indice, setIndice] = useState<IndiceDoCatalogo | null>(null);
  const [carreira, setCarreira] = useState<CarreiraDoCatalogo | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [semEdital, setSemEdital] = useState(false);
  const [preparado, setPreparado] = useState<PontosPreparados | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [criado, setCriado] = useState<{ ponto?: Ponto } | null>(null);
  const [erroAoCriar, setErroAoCriar] = useState(false);

  const mudar = (parte: Partial<Rascunho>) => {
    setRascunho((atual) => {
      const novo = { ...atual, ...parte };
      gravarRascunho(novo);
      return novo;
    });
  };

  useEffect(() => {
    let vivo = true;
    origem.listar().then(
      (i) => {
        if (vivo) setIndice(i);
      },
      () => {
        if (vivo) setFalhou(true);
      },
    );
    return () => {
      vivo = false;
    };
  }, [origem]);

  useEffect(() => {
    const slug = rascunho.carreira;
    if (!slug) return;
    let vivo = true;
    origem.obter(slug).then(
      (c) => {
        if (vivo) setCarreira(c);
      },
      (e: unknown) => {
        // Carreira que sumiu do catálogo: volta a perguntar em vez de travar.
        if (!vivo) return;
        if (e instanceof CatalogoIndisponivel && e.motivo === 'nao_encontrado') {
          mudar({ passo: 'carreira', carreira: undefined, edital: undefined });
        } else setFalhou(true);
      },
    );
    return () => {
      vivo = false;
    };
  }, [origem, rascunho.carreira]);

  const editais = useMemo(() => (carreira ? editaisOferecidos(carreira) : []), [carreira]);
  const edital = editais.find((e) => e.id === rascunho.edital) ?? editais[0];
  const desmarcadas = useMemo(() => new Set(rascunho.desmarcadas), [rascunho.desmarcadas]);
  const dispensados = useMemo(() => new Set(rascunho.dispensados), [rascunho.dispensados]);
  const linhas = useMemo(() => {
    if (!edital) return [];
    const escolhidas = new Set(
      disciplinasDoEdital(edital)
        .map(({ nome }) => chaveDeNome(nome))
        .filter((c) => !desmarcadas.has(c)),
    );
    return linhasDoEdital(edital, escolhidas, dispensados);
  }, [edital, desmarcadas, dispensados]);

  const emRevisao = rascunho.passo === 'revisar' && edital !== undefined;
  useEffect(() => {
    if (!emRevisao || linhas.length === 0) return;
    let vivo = true;
    prepararPontos(repo, linhas, JSON.stringify(linhas)).then(
      (p) => {
        if (vivo) setPreparado(p);
      },
      () => {
        if (vivo) setFalhou(true);
      },
    );
    return () => {
      vivo = false;
      setPreparado(null);
    };
  }, [emRevisao, linhas, repo]);

  const pular = () => {
    limparRascunho();
    setSemEdital(true);
  };

  const criar = async () => {
    if (!preparado) return;
    setOcupado(true);
    setErroAoCriar(false);
    try {
      await aplicar(repo, preparado.pacote, preparado.previa, new Map(), {
        descricao: 'Plano pelo catálogo',
      });
      limparRascunho();
      const pontos = (preparado.pacote.registros.get('pontos') ?? []) as Ponto[];
      const primeiro =
        pontos.find((p) => p.faixa === 'altissima' && linhas.some((l) => l.titulo === p.titulo)) ??
        pontos[0];
      setCriado(primeiro ? { ponto: primeiro } : {});
    } catch {
      setErroAoCriar(true);
    } finally {
      setOcupado(false);
    }
  };

  if (semEdital) return <SemEdital />;
  if (criado) return <ComecePorAqui {...(criado.ponto ? { ponto: criado.ponto } : {})} />;
  if (falhou) {
    return (
      <>
        <Falha
          oQue="Não foi possível carregar os editais."
          oQueFazer="Você pode importar sua própria planilha de pontos."
        />
        <SemEdital />
      </>
    );
  }
  if (!indice) return <Esqueleto />;

  const numero = ORDEM.indexOf(rascunho.passo) + 1;
  const voltar =
    numero > 1
      ? () => {
          mudar({ passo: ORDEM[numero - 2] ?? 'carreira' });
        }
      : undefined;
  const moldura = (filhos: ReactNode, continuar: ReactNode) => (
    <Moldura
      passo={numero}
      titulo={TITULOS[rascunho.passo]}
      aoPular={pular}
      {...(voltar ? { aoVoltar: voltar } : {})}
    >
      {filhos}
      {continuar}
    </Moldura>
  );
  const continuar = (rotulo: string, aoClicar: () => void, desabilitado = false) => (
    <div className="linha-acoes">
      <button type="button" className="principal" disabled={desabilitado} onClick={aoClicar}>
        {rotulo}
      </button>
    </div>
  );

  if (rascunho.passo === 'carreira' || !rascunho.carreira) {
    return moldura(
      <PassoCarreira
        carreiras={indice.carreiras}
        {...(rascunho.carreira ? { escolhida: rascunho.carreira } : {})}
        aoEscolher={(slug) => {
          if (slug !== rascunho.carreira) setCarreira(null);
          mudar({ carreira: slug, edital: undefined, desmarcadas: [], dispensados: [] });
        }}
      />,
      continuar(
        'Continuar',
        () => {
          mudar({ passo: 'edital' });
        },
        !rascunho.carreira,
      ),
    );
  }
  if (!carreira || carreira.slug !== rascunho.carreira) return <Esqueleto />;
  // Carreira sem edital oferecível: cai no caminho "sem edital".
  if (!edital) return <SemEdital />;

  if (rascunho.passo === 'edital') {
    return moldura(
      <PassoEdital
        editais={editais}
        escolhido={edital.id}
        aoEscolher={(id) => {
          mudar({ edital: id, desmarcadas: [], dispensados: [] });
        }}
      />,
      continuar('Continuar', () => {
        mudar({ edital: edital.id, passo: 'disciplinas' });
      }),
    );
  }
  if (rascunho.passo === 'disciplinas') {
    return moldura(
      <PassoDisciplinas
        carreira={carreira}
        edital={edital}
        desmarcadas={desmarcadas}
        dispensados={dispensados}
        aoAlternarDisciplina={(c) => {
          mudar({ desmarcadas: alternar(rascunho.desmarcadas, c) });
        }}
        aoAlternarAssunto={(c) => {
          mudar({ dispensados: alternar(rascunho.dispensados, c) });
        }}
      />,
      continuar(
        'Continuar',
        () => {
          mudar({ passo: 'revisar' });
        },
        linhas.length === 0,
      ),
    );
  }
  return moldura(
    linhas.length === 0 ? (
      <p>Nenhum assunto marcado. Volte e escolha ao menos um.</p>
    ) : !preparado ? (
      <Esqueleto />
    ) : (
      <>
        <p>
          {preparado.pontos} pontos em {preparado.disciplinas} matérias, a partir do{' '}
          {edital.rotulo ?? 'catálogo'}.
        </p>
        <PreviaImportacao
          previa={preparado.previa}
          confirmando={ocupado}
          rotuloConfirmar="Criar meu plano"
          aoConfirmar={() => void criar()}
          aoVoltar={() => {
            mudar({ passo: 'disciplinas' });
          }}
        />
        {erroAoCriar && (
          <p role="alert" className="aviso falha">
            Não foi possível criar o plano. Nada foi alterado.
          </p>
        )}
      </>
    ),
    null,
  );
}
