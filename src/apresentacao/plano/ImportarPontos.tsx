import { useRef, useState } from 'react';
import { aplicar } from '../../core/pacote';
import { CsvInvalido, decodificarCsv, lerCsvPontos } from '../../integracoes/pontos/csv';
import { prepararPontos, type PontosPreparados } from '../../integracoes/pontos/importar';
import { PreviaImportacao } from '../conta/dados/PreviaImportacao';
import { useRepositorio } from '../dados/contexto';
import './estilos-plano.css';

const PROMPT_IA = `Transforme o conteúdo programático do edital abaixo numa tabela para eu importar numa plataforma de estudo.

Regras:
1. Use só o que está no texto do edital. Não invente, não resuma, não junte nem acrescente assuntos.
2. Uma linha por ponto do conteúdo programático. Se um ponto tiver subitens numerados (por exemplo 3.1, 3.2), cada subitem vira uma linha.
3. Três colunas, nesta ordem, separadas por ponto e vírgula: Disciplina;Ponto;Código
   - Disciplina: o nome da matéria como aparece no edital.
   - Ponto: o texto completo do assunto, sem a numeração.
   - Código: a numeração do edital (por exemplo 3.2); deixe vazio se não houver.
4. A primeira linha é o cabeçalho: Disciplina;Ponto;Código
5. Se algum texto tiver ponto e vírgula, coloque esse campo entre aspas duplas.
6. Se o edital tiver mais de um cargo, use só o conteúdo do cargo: [escreva aqui o seu cargo].
7. Responda só com a tabela, dentro de um bloco de código, sem comentário antes ou depois.

Conteúdo programático do edital:
[cole aqui]`;

function limparTextoColado(bruto: string): string {
  const linhas = bruto.split(/\r?\n/);
  const semCercas = linhas.filter((linha) => !linha.trimStart().startsWith('```'));
  return semCercas.join('\n').trim();
}

/** Importa os pontos do edital de um CSV ou de texto colado da IA. */
export function ImportarPontos({
  aoImportar,
  afastado = false,
}: {
  aoImportar?: (mensagem: string) => void;
  afastado?: boolean;
}) {
  const repo = useRepositorio();
  const [preparado, setPreparado] = useState<(PontosPreparados & { avisos: string[] }) | null>(
    null,
  );
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'falha'; texto: string } | null>(null);
  const [textoColado, setTextoColado] = useState('');
  const [copiado, setCopiado] = useState(false);
  const promptRef = useRef<HTMLPreElement>(null);

  const processarTexto = async (texto: string) => {
    setOcupado(true);
    setMensagem(null);
    try {
      const { linhas, avisos } = lerCsvPontos(texto);
      setPreparado({ ...(await prepararPontos(repo, linhas, texto)), avisos });
    } catch (excecao) {
      setMensagem({
        tipo: 'falha',
        texto: excecao instanceof CsvInvalido ? excecao.message : 'Não foi possível ler o arquivo.',
      });
    } finally {
      setOcupado(false);
    }
  };

  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    try {
      const texto = decodificarCsv(new Uint8Array(await arquivo.arrayBuffer()));
      await processarTexto(texto);
    } catch {
      setMensagem({
        tipo: 'falha',
        texto: 'Não foi possível ler o arquivo.',
      });
    }
  };

  const lerColado = async () => {
    const textoLimpo = limparTextoColado(textoColado);
    await processarTexto(textoLimpo);
  };

  const copiarPrompt = async () => {
    try {
      await navigator.clipboard.writeText(PROMPT_IA);
      setCopiado(true);
      setTimeout(() => {
        setCopiado(false);
      }, 2000);
    } catch {
      setCopiado(false);
      if (promptRef.current) {
        const range = document.createRange();
        range.selectNodeContents(promptRef.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  };

  const confirmar = async () => {
    if (!preparado) return;
    setOcupado(true);
    try {
      await aplicar(repo, preparado.pacote, preparado.previa, new Map(), {
        descricao: 'Pontos do edital (CSV)',
      });
      setPreparado(null);
      const texto = 'Pontos importados. Se precisar, desfaça em Conta › Dados › Importações.';
      // A tela do Plano troca de estado ao importar: quem mostra a confirmação é ela.
      if (aoImportar) aoImportar(texto);
      else setMensagem({ tipo: 'ok', texto });
    } catch {
      setMensagem({ tipo: 'falha', texto: 'Não foi possível importar. Nada foi alterado.' });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section
      id="importar-edital"
      className={`cartao-bloco plano-importar-bloco${afastado ? ' afastado' : ''}`}
      aria-labelledby="t-importar-pontos"
    >
      <h2 id="t-importar-pontos">Importar pontos do edital</h2>
      {!preparado ? (
        <>
          <p className="dica">
            Planilha salva como CSV com as colunas Disciplina, Ponto e, se quiser, Faixa (Altíssima,
            Alta, Média ou Extra) e Código.
          </p>
          <details className="importar-ajuda-ia">
            <summary className="botao botao-texto na-margem">Não sabe montar a planilha?</summary>
            <div className="importar-ajuda-ia-conteudo">
              <p className="dica">
                Copie o texto abaixo, cole na sua IA preferida junto com o conteúdo programático do
                edital e traga o resultado para cá.
              </p>
              <div className="importar-prompt-bloco">
                <pre
                  ref={promptRef}
                  className="importar-prompt-texto"
                  tabIndex={0}
                  aria-label="Prompt para IA"
                >
                  {PROMPT_IA}
                </pre>
                <button
                  type="button"
                  className="botao"
                  onClick={() => {
                    void copiarPrompt();
                  }}
                >
                  {copiado ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          </details>
          <div className="importar-opcoes">
            <div className="campo">
              <label htmlFor="pontos-arquivo">Arquivo CSV</label>
              <input
                id="pontos-arquivo"
                type="file"
                accept=".csv,text/csv"
                disabled={ocupado}
                onChange={(e) => {
                  void escolher(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
            <div className="campo importar-colado-campo">
              <label htmlFor="pontos-colados">Ou cole o resultado da IA</label>
              <textarea
                id="pontos-colados"
                value={textoColado}
                onChange={(e) => {
                  setTextoColado(e.target.value);
                }}
                disabled={ocupado}
                rows={4}
                placeholder="Cole aqui a tabela gerada..."
              />
              <div className="importar-colado-acoes">
                <button
                  type="button"
                  className="botao"
                  disabled={ocupado}
                  onClick={() => {
                    void lerColado();
                  }}
                >
                  Ler o texto colado
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <p>
            {preparado.pontos} pontos em {preparado.disciplinas} disciplinas.
          </p>
          {preparado.avisos.map((a) => (
            <p key={a} className="aviso">
              {a}
            </p>
          ))}
          <PreviaImportacao
            previa={preparado.previa}
            confirmando={ocupado}
            rotuloConfirmar="Importar pontos"
            aoConfirmar={() => void confirmar()}
            aoVoltar={() => {
              setPreparado(null);
            }}
          />
        </>
      )}
      {mensagem && (
        <p
          role={mensagem.tipo === 'ok' ? 'status' : 'alert'}
          className={mensagem.tipo === 'ok' ? 'sucesso' : 'aviso falha'}
        >
          {mensagem.texto}
        </p>
      )}
    </section>
  );
}
