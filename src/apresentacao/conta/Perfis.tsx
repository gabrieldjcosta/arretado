import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import type { PerfilDeEstudo } from '../../core/modelo';
import {
  alteracoesDoPerfil,
  alterarPreferencias,
  fotografar,
  obterPreferencias,
  PERFIS,
  preverPerfil,
} from '../../core/preferencias';
import { Esqueleto } from '../componentes/estados';
import { useDados, useRepositorio } from '../dados/contexto';
import './estilos-perfis.css';

type Foto = ReturnType<typeof fotografar>;

/** Perfis de estudo (F3-A, pacote 4): opcionais, com prévia e volta atrás; só mudam padrões da interface. */
export function Perfis() {
  const repo = useRepositorio();
  const { dados: salvas } = useDados(useCallback((r) => obterPreferencias(r), []));
  const [escolhido, setEscolhido] = useState<PerfilDeEstudo | null>(null);
  // Fotografia de antes da última aplicação: desfaz exatamente, até recarregar a página.
  const [antes, setAntes] = useState<Foto | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [pendente, setPendente] = useState<Partial<NonNullable<typeof salvas>>>({});
  if (!salvas) return <Esqueleto />;
  const atual = { ...salvas, ...pendente };
  const previa = escolhido ? preverPerfil(atual, escolhido) : [];

  const gravar = async (alteracoes: Parameters<typeof alterarPreferencias>[1], msg: string) => {
    setFalhou(false);
    setOcupado(true);
    try {
      const nova = await alterarPreferencias(repo, alteracoes);
      setPendente(nova);
      setAviso(msg);
    } catch {
      setFalhou(true);
    } finally {
      setOcupado(false);
    }
  };

  const aplicar = async () => {
    if (!escolhido) return;
    const foto = fotografar(atual);
    await gravar(alteracoesDoPerfil(atual, escolhido), `Perfil ${nome(escolhido)} aplicado.`);
    setAntes(foto);
    setEscolhido(null);
  };

  const voltar = async () => {
    if (antes) {
      await gravar(antes, 'Voltou ao que estava antes.');
      setAntes(null);
    } else if (atual.perfilAnterior) {
      await gravar(
        { ...alteracoesDoPerfil({}, atual.perfilAnterior), perfilAnterior: undefined },
        `Voltou ao perfil ${nome(atual.perfilAnterior)}.`,
      );
    }
  };

  const semPerfil = async () => {
    await gravar(
      { perfilDeEstudo: undefined, perfilAnterior: undefined },
      'Sem perfil. Seus ajustes continuam como estão.',
    );
    setAntes(null);
    setEscolhido(null);
  };

  const podeVoltar = antes !== null || atual.perfilAnterior !== undefined;

  return (
    <>
      <h1>Perfis de estudo</h1>
      <p className="dica">
        Opcional. Um perfil só muda alguns padrões da tela; você pode ver antes, voltar quando
        quiser e ajustar cada item depois em <Link to="/conta/aparencia">Aparência</Link>.
      </p>
      {falhou && (
        <p role="alert" className="aviso falha">
          Não foi possível guardar a mudança. Tudo continua como estava; tente de novo.
        </p>
      )}
      {aviso && (
        <p role="status" className="aviso">
          {aviso}
        </p>
      )}
      <fieldset className="perfis-lista">
        <legend>Escolha um para ver o que muda</legend>
        {PERFIS.map((p) => (
          <label key={p.id} className="opcao perfil-opcao">
            <input
              type="radio"
              name="perfil"
              checked={escolhido === p.id}
              onChange={() => {
                setEscolhido(p.id);
                setAviso(null);
              }}
            />
            {p.nome}
            {atual.perfilDeEstudo === p.id ? ' (em uso)' : ''}
            <span className="dica">{p.resumo}</span>
          </label>
        ))}
      </fieldset>
      {escolhido && (
        <section className="perfil-previa" aria-labelledby="previa-titulo">
          <h2 id="previa-titulo">O que muda com {nome(escolhido)}</h2>
          {previa.length === 0 ? (
            <p className="dica">Nada muda: seus ajustes já são esses.</p>
          ) : (
            <ul>
              {previa.map((m) => (
                <li key={m.campo}>
                  {m.rotulo}: {m.de} → {m.para}
                </li>
              ))}
            </ul>
          )}
          <div className="perfil-acoes">
            <button
              type="button"
              className="principal"
              disabled={ocupado}
              onClick={() => void aplicar()}
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={() => {
                setEscolhido(null);
              }}
            >
              Cancelar
            </button>
          </div>
        </section>
      )}
      {(podeVoltar || atual.perfilDeEstudo) && (
        <div className="perfil-acoes">
          {podeVoltar && (
            <button type="button" disabled={ocupado} onClick={() => void voltar()}>
              {antes ? 'Voltar ao que estava' : `Voltar ao perfil ${nome(atual.perfilAnterior)}`}
            </button>
          )}
          {atual.perfilDeEstudo && (
            <button type="button" disabled={ocupado} onClick={() => void semPerfil()}>
              Ficar sem perfil
            </button>
          )}
        </div>
      )}
    </>
  );
}

function nome(id: PerfilDeEstudo | undefined): string {
  return PERFIS.find((p) => p.id === id)?.nome ?? '';
}
