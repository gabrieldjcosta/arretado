// Escolhe um dispositivo de uma norma pelo endereço digitado ("art. 5º, XLIX") — a mesma leitura
// da busca do leitor. Serve ao vínculo de precedente com a lei e com súmulas e teses do acervo.
import { useCallback, useState, type SyntheticEvent } from 'react';
import { analisarEndereco, resolverEndereco } from '../../../dominios/legislacao/busca';
import { todos } from '../../../dominios/legislacao/consultas';
import { useDados, useRepositorio } from '../../dados/contexto';

export interface DispositivoEscolhido {
  normaId: string;
  dispositivoId: string;
  endereco: string;
  /** "CF, art. 5º, XLIX": para mostrar. */
  rotulo: string;
}

export function EscolherDispositivo({
  rotuloDoBotao,
  escolher,
}: {
  rotuloDoBotao: string;
  escolher: (d: DispositivoEscolhido) => Promise<void>;
}) {
  const repo = useRepositorio();
  const carregar = useCallback(
    (r: typeof repo) => todos(r.colecao('normas'), { indice: 'usuarioId' }),
    [],
  );
  const { dados: normas } = useDados(carregar);
  const [normaId, setNormaId] = useState('');
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function aoEnviar(e: SyntheticEvent) {
    e.preventDefault();
    setAviso('');
    const norma = normas?.find((n) => n.id === normaId);
    if (!norma) {
      setAviso('Escolha a norma.');
      return;
    }
    const possiveis = analisarEndereco(texto);
    // Súmula e tese: "593" ou "súmula 593" vira o endereço da coleção (s593, sv11, tese12).
    const pedidos = possiveis.length > 0 ? possiveis : [texto.trim()];
    setOcupado(true);
    try {
      const dispositivos = await todos(repo.colecao('dispositivos'), {
        indice: '[normaId+endereco]',
        de: [norma.id, ''],
        ate: [norma.id, '￿'],
      });
      const porEndereco = new Map(dispositivos.map((d) => [d.endereco, d]));
      const r = resolverEndereco(pedidos, (end) => porEndereco.has(end));
      const d = r && porEndereco.get(r.endereco);
      if (!r || !d) {
        setAviso('Não achei esse dispositivo nessa norma.');
        return;
      }
      await escolher({
        normaId: norma.id,
        dispositivoId: d.id,
        endereco: d.endereco,
        rotulo: `${norma.tituloCurto}, ${d.rotulo ?? d.endereco}`,
      });
      setTexto('');
    } catch {
      setAviso('Não foi possível vincular. Tente de novo; nada foi perdido.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        void aoEnviar(e);
      }}
    >
      <label className="resumo-campo">
        Norma
        <select
          value={normaId}
          onChange={(e) => {
            setNormaId(e.target.value);
          }}
        >
          <option value="">Escolha…</option>
          {normas?.map((n) => (
            <option key={n.id} value={n.id}>
              {n.tituloCurto}
            </option>
          ))}
        </select>
      </label>
      <label className="resumo-campo">
        Dispositivo
        <input
          type="text"
          value={texto}
          placeholder="art. 5º, XLIX ou s593"
          onChange={(e) => {
            setTexto(e.target.value);
          }}
        />
      </label>
      {aviso && (
        <p role="alert" className="aviso falha">
          {aviso}
        </p>
      )}
      <div className="linha-acoes">
        <button type="submit" disabled={ocupado || !normaId || !texto.trim()}>
          {rotuloDoBotao}
        </button>
      </div>
    </form>
  );
}
