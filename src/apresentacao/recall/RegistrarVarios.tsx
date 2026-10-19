import { useState, type SubmitEvent } from 'react';
import { Link } from 'react-router';
import type { Intervalo } from '../../core/modelo';
import { criarCartaoDeLacuna, fraseDoErro, registrarErro } from '../../dominios/recall/servico';
import { useDados, useRepositorio } from '../dados/contexto';
import { pontosEDisciplinas } from './carregadores';
import { EditorDeLacuna } from './EditorDeLacuna';

/**
 * Registrar vários de uma vez (bateria de questões de outra plataforma): cola as frases certas,
 * uma por linha, e em cada linha escolhe, se quiser, o trecho a esconder. Cada linha vira um
 * Erro com a Frase dele (D25: só a frase é obrigatória); com trecho, também o cartão de lacuna.
 */
export function RegistrarVarios() {
  const repo = useRepositorio();
  const vinculos = useDados(pontosEDisciplinas);
  const [bruto, setBruto] = useState('');
  const [disciplinaId, setDisciplinaId] = useState('');
  // Por texto da linha: editar outra linha não perde o que já foi escondido.
  const [ocultos, setOcultos] = useState<Record<string, Intervalo[]>>({});
  const [aberta, setAberta] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [feito, setFeito] = useState<{ frases: number; cartoes: number } | null>(null);

  const linhas = [
    ...new Set(
      bruto
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    ),
  ];

  const salvar = async (e: SubmitEvent) => {
    e.preventDefault();
    if (linhas.length === 0 || salvando) return;
    setSalvando(true);
    setFalha(null);
    let frases = 0;
    let cartoes = 0;
    try {
      for (const linha of linhas) {
        const erro = await registrarErro(repo, {
          fraseCorreta: linha,
          ...(disciplinaId ? { disciplinaId } : {}),
        });
        frases++;
        const marcas = ocultos[linha] ?? [];
        const frase = marcas.length > 0 ? await fraseDoErro(repo, erro.id) : undefined;
        if (frase) {
          await criarCartaoDeLacuna(repo, frase.id, marcas);
          cartoes++;
        }
      }
      setFeito({ frases, cartoes });
    } catch {
      // As linhas já salvas saem da lista, para não duplicar ao tentar de novo.
      setBruto(linhas.slice(frases).join('\n'));
      setFalha(
        `Salvei ${String(frases)} e parei. Confira e tente de novo; o que já foi salvo não repete.`,
      );
    } finally {
      setSalvando(false);
    }
  };

  if (feito) {
    return (
      <>
        <h1>Registrar vários</h1>
        <p role="status" className="sucesso">
          {feito.frases} {feito.frases === 1 ? 'frase registrada' : 'frases registradas'}
          {feito.cartoes > 0
            ? `, ${String(feito.cartoes)} ${feito.cartoes === 1 ? 'cartão' : 'cartões'} com lacuna. Primeira revisão amanhã.`
            : '.'}
        </p>
        <div className="linha-acoes">
          <Link to="/recall" className="botao principal">
            Voltar ao Fixar
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>Registrar vários</h1>
      <form onSubmit={(e) => void salvar(e)}>
        <div className="campo">
          <label htmlFor="varios-frases">Frases certas</label>
          <textarea
            id="varios-frases"
            rows={6}
            value={bruto}
            autoFocus
            aria-describedby="varios-dica"
            onChange={(e) => {
              setBruto(e.target.value);
            }}
          />
          <p id="varios-dica" className="dica">
            Uma frase por linha, do jeito que você quer lembrar.
          </p>
        </div>
        {vinculos.dados && vinculos.dados.disciplinas.length > 0 && (
          <div className="campo">
            <label htmlFor="varios-disciplina">Disciplina de todas (opcional)</label>
            <select
              id="varios-disciplina"
              value={disciplinaId}
              onChange={(e) => {
                setDisciplinaId(e.target.value);
              }}
            >
              <option value="">—</option>
              {vinculos.dados.disciplinas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          </div>
        )}
        {linhas.length > 0 && (
          <ul className="lista-simples frases" aria-label="Frases a registrar">
            {linhas.map((linha) => (
              <li key={linha}>
                {aberta === linha ? (
                  <EditorDeLacuna
                    texto={linha}
                    ocultos={ocultos[linha] ?? []}
                    aoMudar={(o) => {
                      setOcultos({ ...ocultos, [linha]: o });
                    }}
                  />
                ) : (
                  <span className="texto-leitura">{linha}</span>
                )}
                <button
                  type="button"
                  className="botao botao-texto na-margem"
                  aria-label={`${aberta === linha ? 'Pronto' : 'Esconder trecho'}: ${linha}`}
                  onClick={() => {
                    setAberta(aberta === linha ? null : linha);
                  }}
                >
                  {aberta === linha
                    ? 'Pronto'
                    : (ocultos[linha]?.length ?? 0) > 0
                      ? 'Com lacuna'
                      : 'Esconder trecho'}
                </button>
              </li>
            ))}
          </ul>
        )}
        {falha && (
          <p role="alert" className="aviso falha">
            {falha}
          </p>
        )}
        <div className="linha-acoes">
          <button type="submit" className="principal" disabled={linhas.length === 0 || salvando}>
            {salvando
              ? 'Salvando…'
              : linhas.length > 1
                ? `Salvar ${String(linhas.length)} frases`
                : 'Salvar'}
          </button>
          <Link to="/recall/registrar" className="botao discreto">
            Registrar uma só
          </Link>
        </div>
      </form>
    </>
  );
}
