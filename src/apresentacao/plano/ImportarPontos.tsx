import { useState } from 'react';
import { aplicar } from '../../core/pacote';
import { CsvInvalido, decodificarCsv, lerCsvPontos } from '../../integracoes/pontos/csv';
import { prepararPontos, type PontosPreparados } from '../../integracoes/pontos/importar';
import { PreviaImportacao } from '../conta/dados/PreviaImportacao';
import { useRepositorio } from '../dados/contexto';

/** Importa os pontos do edital de um CSV (planilha do Ciclo Obrigatório exportada). */
export function ImportarPontos({ aoImportar }: { aoImportar?: (mensagem: string) => void }) {
  const repo = useRepositorio();
  const [preparado, setPreparado] = useState<(PontosPreparados & { avisos: string[] }) | null>(
    null,
  );
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'falha'; texto: string } | null>(null);

  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setOcupado(true);
    setMensagem(null);
    try {
      const texto = decodificarCsv(new Uint8Array(await arquivo.arrayBuffer()));
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
    <section className="cartao-bloco" aria-labelledby="t-importar-pontos">
      <h2 id="t-importar-pontos">Importar pontos do edital</h2>
      {!preparado ? (
        <>
          <p className="dica">
            Planilha salva como CSV com as colunas Disciplina, Ponto e, se quiser, Faixa (Altíssima,
            Alta, Média ou Extra) e Código.
          </p>
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
