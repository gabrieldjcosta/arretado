import { useState, type SubmitEvent } from 'react';
import type { Modulo } from '../../../core/modelo';
import {
  aplicar,
  ImportacaoInvalida,
  importarParaEspaco,
  lerPacote,
  PacoteRecusado,
  planejar,
  type PacoteLido,
  type Previa,
} from '../../../core/pacote';
import { useRepositorio } from '../../dados/contexto';
import { PreviaImportacao, type Resolucoes } from './PreviaImportacao';
import { recarregarComAviso } from './recarga';
import { formatarInstante, MODOS, ROTULO_MODULO, type ModoTela } from './rotulos';

type Etapa =
  | { tipo: 'escolher' }
  | { tipo: 'senha'; bytes: Uint8Array; nome: string }
  | { tipo: 'lido'; pacote: PacoteLido; nome: string }
  | { tipo: 'previa'; pacote: PacoteLido; nome: string; previa: Previa }
  | { tipo: 'feito'; texto: string };

function mensagemDe(excecao: unknown): string {
  if (excecao instanceof PacoteRecusado || excecao instanceof ImportacaoInvalida)
    return excecao.message;
  return 'Não foi possível importar. Nada foi alterado.';
}

export function Importar() {
  const repo = useRepositorio();
  const [etapa, setEtapa] = useState<Etapa>({ tipo: 'escolher' });
  const [falha, setFalha] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [senha, setSenha] = useState('');
  const [modo, setModo] = useState<ModoTela>(4);
  const [modulos, setModulos] = useState<Modulo[] | null>(null);
  const [nomeEspaco, setNomeEspaco] = useState('');

  const executar = async (fn: () => Promise<void>) => {
    setFalha(null);
    setOcupado(true);
    try {
      await fn();
    } catch (excecao) {
      setFalha(mensagemDe(excecao));
    } finally {
      setOcupado(false);
    }
  };

  const aoLer = (pacote: PacoteLido, nome: string) => {
    const outro = pacote.manifesto.usuarioId !== repo.ctx.usuarioId;
    setModo(outro ? 6 : 4);
    setModulos(null);
    setNomeEspaco(nome.replace(/\.arretado$/, ''));
    setEtapa({ tipo: 'lido', pacote, nome });
  };

  const escolherArquivo = (arquivo: File | undefined) => {
    if (!arquivo) return;
    void executar(async () => {
      const bytes = new Uint8Array(await arquivo.arrayBuffer());
      try {
        aoLer(await lerPacote(bytes), arquivo.name);
      } catch (excecao) {
        if (excecao instanceof PacoteRecusado && excecao.motivo === 'senha_necessaria') {
          setSenha('');
          setEtapa({ tipo: 'senha', bytes, nome: arquivo.name });
          return;
        }
        throw excecao;
      }
    });
  };

  const abrirComSenha = (e: SubmitEvent) => {
    e.preventDefault();
    if (etapa.tipo !== 'senha') return;
    void executar(async () => {
      const pacote = await lerPacote(etapa.bytes, { senha });
      setSenha('');
      aoLer(pacote, etapa.nome);
    });
  };

  const verPrevia = () => {
    if (etapa.tipo !== 'lido') return;
    void executar(async () => {
      if (modo === 7) return;
      const previa = await planejar(repo, etapa.pacote, {
        modo,
        ...(modulos && modo !== 6 ? { modulos } : {}),
      });
      setEtapa({ ...etapa, tipo: 'previa', previa });
    });
  };

  const importarEspaco = () => {
    if (etapa.tipo !== 'lido') return;
    void executar(async () => {
      await importarParaEspaco(repo, etapa.pacote, nomeEspaco.trim() || etapa.nome);
      setEtapa({
        tipo: 'feito',
        texto: 'Pacote guardado em espaço separado. Confira em "Espaços separados", abaixo.',
      });
    });
  };

  const confirmar = (resolucoes: Resolucoes) => {
    if (etapa.tipo !== 'previa') return;
    void executar(async () => {
      const r = await aplicar(repo, etapa.pacote, etapa.previa, resolucoes);
      if (r.identidadeMudou) {
        recarregarComAviso('Restauração concluída. Se precisar, desfaça em "Importações".');
        return;
      }
      setEtapa({
        tipo: 'feito',
        texto: 'Importação concluída. Se precisar, desfaça em "Importações".',
      });
    });
  };

  const recomecar = () => {
    setFalha(null);
    setEtapa({ tipo: 'escolher' });
  };

  return (
    <section className="cartao-bloco" aria-labelledby="t-importar">
      <h2 id="t-importar">Importar</h2>
      {etapa.tipo === 'escolher' && (
        <div className="campo">
          <label htmlFor="imp-arquivo">Pacote do Arretado (.arretado)</label>
          <input
            id="imp-arquivo"
            type="file"
            accept=".arretado,application/zip"
            disabled={ocupado}
            onChange={(e) => {
              escolherArquivo(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {etapa.tipo === 'senha' && (
        <form onSubmit={abrirComSenha}>
          <p>O pacote {etapa.nome} é protegido por senha.</p>
          <div className="campo">
            <label htmlFor="imp-senha">Senha usada na exportação</label>
            <input
              id="imp-senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
              }}
            />
          </div>
          <div className="linha-acoes">
            <button type="submit" className="principal" disabled={ocupado || senha === ''}>
              {ocupado ? 'Abrindo…' : 'Abrir pacote'}
            </button>
            <button type="button" onClick={recomecar}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {etapa.tipo === 'lido' && (
        <>
          <p>
            <strong>{etapa.nome}</strong> — gerado em{' '}
            {formatarInstante(etapa.pacote.manifesto.criadoEm)}
            {etapa.pacote.cifrado ? ', protegido por senha' : ''}.
          </p>
          <fieldset>
            <legend>Como importar</legend>
            {MODOS.map((m) => (
              <label key={m.modo} className="opcao">
                <input
                  type="radio"
                  name="modo"
                  checked={modo === m.modo}
                  onChange={() => {
                    setModo(m.modo);
                  }}
                />
                <span>
                  <strong>{m.nome}</strong>
                  <br />
                  <span className="dica">{m.descricao}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {modo >= 2 && modo <= 5 && etapa.pacote.manifesto.modulos.length > 1 && (
            <fieldset>
              <legend>Módulos</legend>
              {etapa.pacote.manifesto.modulos.map((m) => {
                const marcados = modulos ?? etapa.pacote.manifesto.modulos;
                return (
                  <label key={m} className="opcao">
                    <input
                      type="checkbox"
                      checked={marcados.includes(m)}
                      onChange={(ev) => {
                        setModulos(
                          ev.target.checked ? [...marcados, m] : marcados.filter((x) => x !== m),
                        );
                      }}
                    />
                    {ROTULO_MODULO[m]}
                  </label>
                );
              })}
            </fieldset>
          )}
          {modo === 7 && (
            <div className="campo">
              <label htmlFor="imp-espaco">Nome do espaço</label>
              <input
                id="imp-espaco"
                type="text"
                maxLength={120}
                value={nomeEspaco}
                onChange={(e) => {
                  setNomeEspaco(e.target.value);
                }}
              />
            </div>
          )}
          <div className="linha-acoes">
            {modo === 7 ? (
              <button
                type="button"
                className="principal"
                disabled={ocupado}
                onClick={importarEspaco}
              >
                {ocupado ? 'Importando…' : 'Importar para espaço separado'}
              </button>
            ) : (
              <button
                type="button"
                className="principal"
                disabled={ocupado || (modo >= 2 && modo <= 5 && modulos?.length === 0)}
                onClick={verPrevia}
              >
                {ocupado ? 'Calculando…' : 'Ver prévia'}
              </button>
            )}
            <button type="button" onClick={recomecar} disabled={ocupado}>
              Escolher outro arquivo
            </button>
          </div>
        </>
      )}

      {etapa.tipo === 'previa' && (
        <PreviaImportacao
          previa={etapa.previa}
          confirmando={ocupado}
          aoConfirmar={confirmar}
          aoVoltar={() => {
            setEtapa({ tipo: 'lido', pacote: etapa.pacote, nome: etapa.nome });
          }}
        />
      )}

      {etapa.tipo === 'feito' && (
        <>
          <p role="status" className="sucesso">
            {etapa.texto}
          </p>
          <div className="linha-acoes">
            <button type="button" onClick={recomecar}>
              Importar outro pacote
            </button>
          </div>
        </>
      )}

      {falha && (
        <p role="alert" className="aviso falha">
          {falha}
        </p>
      )}
    </section>
  );
}
