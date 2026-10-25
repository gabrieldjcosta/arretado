import { useState } from 'react';
import {
  aplicarPacoteNaBiblioteca,
  lerPacoteDeEstrelas,
  PacoteIlegivel,
  type ResultadoDoPacote,
} from '../../../dominios/legislacao/pacote-de-incidencia';
import { useRepositorio } from '../../dados/contexto';

function resumo(r: ResultadoDoPacote): string {
  const porNorma = Object.values(r.porNorma);
  const novas = porNorma.reduce((s, x) => s + x.gravadas.length, 0);
  const mantidas = porNorma.reduce((s, x) => s + x.mantidas.length, 0);
  const sem = r.semNorma.length;
  const partes = [`${novas} estrelas novas em ${porNorma.length} normas`];
  if (mantidas > 0) partes.push(`${mantidas} artigos já estavam estrelados`);
  if (sem > 0) partes.push(`normas do pacote ainda fora da sua biblioteca: ${sem}`);
  return `${partes.join('; ')}.`;
}

/** Estrelas de um pacote de incidência (arquivo .json) nas normas que você já adicionou. */
export function ImportarEstrelas() {
  const repo = useRepositorio();
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'falha'; texto: string } | null>(null);

  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setOcupado(true);
    setMensagem(null);
    try {
      const pacote = lerPacoteDeEstrelas(await arquivo.text());
      setMensagem({ tipo: 'ok', texto: resumo(await aplicarPacoteNaBiblioteca(repo, pacote)) });
    } catch (excecao) {
      setMensagem({
        tipo: 'falha',
        texto:
          excecao instanceof PacoteIlegivel
            ? excecao.message
            : 'Não foi possível aplicar o pacote. Nada foi alterado.',
      });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section className="cartao-bloco" aria-labelledby="t-importar-estrelas">
      <h2 id="t-importar-estrelas">Estrelas de um pacote</h2>
      <p className="dica">
        Põe estrela nos artigos que mais caem, só nas normas que você já adicionou. O que você já
        estrelou ou desmarcou fica como está, e qualquer estrela se tira com um toque.
      </p>
      <div className="campo">
        <label htmlFor="imp-estrelas">Arquivo do pacote (.json)</label>
        <input
          id="imp-estrelas"
          type="file"
          accept=".json,application/json"
          disabled={ocupado}
          onChange={(e) => {
            void escolher(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {mensagem && (
        <p role="status" className={mensagem.tipo === 'ok' ? 'sucesso' : 'erro'}>
          {mensagem.texto}
        </p>
      )}
    </section>
  );
}
