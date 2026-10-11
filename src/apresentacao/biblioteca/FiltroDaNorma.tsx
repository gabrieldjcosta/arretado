import { useId, useState, type SyntheticEvent } from 'react';
import { resolverEndereco } from '../../dominios/legislacao/busca';
import { possiveisEnderecos } from '../../dominios/legislacao/sumulas';
import type { CriterioDoFiltro } from '../../dominios/legislacao/filtros';
import { Dialogo } from '../componentes/Dialogo';

/** Um bloco (título, capítulo, seção…) da norma, para o filtro por bloco. */
export interface OpcaoDeBloco {
  /** Índice do nó em `NormaAberta.nos`. */
  indice: number;
  /** "TÍTULO II › CAPÍTULO I": o caminho, porque o capítulo se repete de título em título. */
  rotulo: string;
  /** Níveis acima: o recuo do nome na lista. */
  nivel: number;
}

type Escolha = 'tudo' | 'estrelados' | 'marcados' | 'com_erros' | 'trecho';

const ESCOLHAS: readonly { valor: Escolha; nome: string; dica?: string }[] = [
  { valor: 'tudo', nome: 'Tudo' },
  { valor: 'estrelados', nome: 'Só os estrelados', dica: 'Com os blocos estrelados por inteiro.' },
  { valor: 'marcados', nome: 'Só com grifo ou nota' },
  { valor: 'com_erros', nome: 'Só com erro vinculado' },
  { valor: 'trecho', nome: 'Só um trecho', dica: 'De um artigo a outro, ou um bloco.' },
];

/** O que o filtro mostra agora, para abrir o diálogo já nessa escolha. */
export interface FiltroAtual {
  criterio: CriterioDoFiltro;
  /** O trecho escolhido por bloco (para marcar o bloco na lista). */
  blocoIndice?: number;
}

/**
 * Filtros do leitor (F2, 11.3), num diálogo: tudo, só os estrelados, só os com grifo ou nota, só
 * os com erro vinculado ou só um trecho (de um endereço a outro, ou um bloco). Os nós de contexto
 * ficam sempre. Aplicar fecha o diálogo; o leitor guarda o filtro enquanto a norma está aberta.
 */
export function FiltroDaNorma({
  aberto,
  aoFechar,
  atual,
  blocos,
  indiceDoEndereco,
  referencia,
  aplicar,
  mostrarTudo,
}: {
  aberto: boolean;
  aoFechar: () => void;
  atual: FiltroAtual | undefined;
  blocos: readonly OpcaoDeBloco[];
  /** O índice do nó com o endereço canônico, se a norma o tem. */
  indiceDoEndereco: (endereco: string) => number | undefined;
  /** "Art. 112, § 2º": a referência do nó. */
  referencia: (indice: number) => string;
  /** Aplica o critério; devolve a mensagem de falha, ou nada se deu certo (o diálogo fecha). */
  aplicar: (
    criterio: CriterioDoFiltro,
    descricaoDoTrecho?: string,
    blocoIndice?: number,
  ) => Promise<string | undefined>;
  mostrarTudo: () => void;
}) {
  const nome = useId();
  const idDe = useId();
  const idAte = useId();
  const idBloco = useId();
  const idErro = useId();
  const [escolha, setEscolha] = useState<Escolha>(atual?.criterio.tipo ?? 'tudo');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [bloco, setBloco] = useState(
    atual?.blocoIndice === undefined ? '' : String(atual.blocoIndice),
  );
  const [erro, setErro] = useState<string | undefined>(undefined);
  const [aplicando, setAplicando] = useState(false);

  /** O índice do dispositivo que o texto digitado nomeia; só o exato vale (não o mais próximo). */
  function indiceDe(texto: string): number | undefined {
    const possiveis = possiveisEnderecos(texto);
    if (possiveis.length === 0) return undefined;
    const resolvido = resolverEndereco(possiveis, (e) => indiceDoEndereco(e) !== undefined);
    return resolvido === undefined || resolvido.faltou !== undefined
      ? undefined
      : indiceDoEndereco(resolvido.endereco);
  }

  async function enviar(e: SyntheticEvent) {
    e.preventDefault();
    setErro(undefined);
    if (escolha === 'tudo') {
      mostrarTudo();
      return;
    }
    if (escolha !== 'trecho') {
      await aplicarComEspera({ tipo: escolha });
      return;
    }
    if (bloco !== '') {
      const opcao = blocos.find((b) => String(b.indice) === bloco);
      if (!opcao) {
        setErro('Escolha um bloco da lista.');
        return;
      }
      await aplicarComEspera(
        { tipo: 'trecho', de: opcao.indice, ate: opcao.indice },
        opcao.rotulo,
        opcao.indice,
      );
      return;
    }
    if (de.trim() === '') {
      setErro('Escreva de onde começa (por exemplo, 5 ou art. 112) ou escolha um bloco.');
      return;
    }
    const primeiro = indiceDe(de);
    if (primeiro === undefined) {
      setErro(`Não encontrei “${de.trim()}” nesta norma. Escreva um artigo, como 5 ou 9-A.`);
      return;
    }
    const ultimo = ate.trim() === '' ? primeiro : indiceDe(ate);
    if (ultimo === undefined) {
      setErro(`Não encontrei “${ate.trim()}” nesta norma. Escreva um artigo, como 20.`);
      return;
    }
    const inicio = Math.min(primeiro, ultimo);
    const fim = Math.max(primeiro, ultimo);
    await aplicarComEspera(
      { tipo: 'trecho', de: inicio, ate: fim },
      inicio === fim ? referencia(inicio) : `${referencia(inicio)} a ${referencia(fim)}`,
    );
  }

  async function aplicarComEspera(
    criterio: CriterioDoFiltro,
    descricaoDoTrecho?: string,
    blocoIndice?: number,
  ) {
    setAplicando(true);
    const falha = await aplicar(criterio, descricaoDoTrecho, blocoIndice);
    setAplicando(false);
    if (falha) setErro(falha);
  }

  return (
    <Dialogo aberto={aberto} aoFechar={aoFechar} titulo="Filtrar a norma" classe="dialogo-filtro">
      <form
        onSubmit={(e) => {
          void enviar(e);
        }}
      >
        <fieldset className="filtro-escolhas">
          <legend>Mostrar</legend>
          {ESCOLHAS.map((opcao) => (
            <label key={opcao.valor} className="filtro-escolha">
              <input
                type="radio"
                name={nome}
                value={opcao.valor}
                checked={escolha === opcao.valor}
                onChange={() => {
                  setEscolha(opcao.valor);
                  setErro(undefined);
                }}
              />
              <span>
                {opcao.nome}
                {opcao.dica && <small> {opcao.dica}</small>}
              </span>
            </label>
          ))}
        </fieldset>
        {escolha === 'trecho' && (
          <div className="filtro-trecho">
            <div className="filtro-intervalo">
              <label htmlFor={idDe}>De</label>
              <input
                id={idDe}
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="5"
                value={de}
                disabled={bloco !== ''}
                aria-describedby={erro ? idErro : undefined}
                onChange={(e) => {
                  setDe(e.target.value);
                }}
              />
              <label htmlFor={idAte}>até</label>
              <input
                id={idAte}
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="20"
                value={ate}
                disabled={bloco !== ''}
                aria-describedby={erro ? idErro : undefined}
                onChange={(e) => {
                  setAte(e.target.value);
                }}
              />
            </div>
            <p className="filtro-ajuda">
              Um artigo ou o endereço dele; vazio em “até” é só o primeiro.
            </p>
            {blocos.length > 0 && (
              <div className="filtro-bloco">
                <label htmlFor={idBloco}>Ou um bloco da norma</label>
                <select
                  id={idBloco}
                  value={bloco}
                  onChange={(e) => {
                    setBloco(e.target.value);
                    setErro(undefined);
                  }}
                >
                  <option value="">Nenhum (usar De e até)</option>
                  {blocos.map((b) => (
                    <option key={b.indice} value={b.indice}>
                      {b.rotulo}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        {erro && (
          <p id={idErro} role="alert" className="aviso falha">
            {erro}
          </p>
        )}
        <div className="linha-acoes">
          <button type="submit" disabled={aplicando}>
            {escolha === 'tudo' ? 'Mostrar tudo' : 'Mostrar'}
          </button>
          <button type="button" onClick={aoFechar}>
            Fechar
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
