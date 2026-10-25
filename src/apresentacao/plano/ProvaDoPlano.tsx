// A data da prova objetiva (AP-03): um campo opcional. O app a usa só para não marcar Revisão depois
// dela e para fazer uma passada final pelos Pontos mais cobrados; não mostra contagem regressiva.
import { useEffect, useRef, useState } from 'react';
import { dataDaProvaInformada, definirDataDaProva } from '../../dominios/recall/prova';
import { hoje as hojeDe } from '../../dominios/recall/servico';
import { useDados, useRepositorio } from '../dados/contexto';

const formatar = (d: string) => d.split('-').reverse().join('/');

const amanhaDe = (hoje: string) => {
  const d = new Date(`${hoje}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export function ProvaDoPlano() {
  const repo = useRepositorio();
  const { dados } = useDados(dataDaProvaInformada);
  const [aberto, setAberto] = useState(false);
  const [digitada, setDigitada] = useState<string | null>(null);
  const [falha, setFalha] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const mudar = useRef<HTMLButtonElement>(null);
  const informar = useRef<HTMLButtonElement>(null);
  const devolverFoco = useRef<'campo' | 'mudar' | 'informar' | null>(null);
  const hoje = hojeDe(repo);
  const amanha = amanhaDe(hoje);
  const valor = digitada ?? dados ?? '';
  const mudou = valor !== (dados ?? '');
  const valida = valor >= amanha;
  const passou = valor !== '' && valor <= hoje;
  const guardada = dados !== undefined;
  const editando = aberto || (!guardada && digitada !== null);

  useEffect(() => {
    const alvo = { campo, mudar, informar }[devolverFoco.current ?? 'campo'].current;
    if (devolverFoco.current !== null && alvo) {
      alvo.focus();
      devolverFoco.current = null;
    }
  });

  const abrir = () => {
    devolverFoco.current = 'campo';
    setAberto(true);
  };

  const gravar = (data: string | null) => {
    setFalha(false);
    definirDataDaProva(repo, data).then(
      () => {
        setDigitada(null);
        setAberto(false);
        devolverFoco.current = data === null ? 'informar' : 'mudar';
      },
      () => {
        setFalha(true);
      },
    );
  };

  return (
    <section className="prova-do-plano" aria-label="Data da prova">
      {guardada && !editando ? (
        <p className="prova-guardada">
          <span>
            Prova objetiva: {formatar(dados)}
            {dados <= hoje && ' · já passou; atualize quando souber a próxima'}
          </span>
          <button ref={mudar} type="button" className="botao-texto" onClick={abrir}>
            Mudar
          </button>
          <button
            type="button"
            className="botao-texto"
            onClick={() => {
              gravar(null);
            }}
          >
            Tirar
          </button>
        </p>
      ) : !editando ? (
        <button
          type="button"
          ref={informar}
          className="botao-texto prova-informar"
          aria-expanded={false}
          onClick={abrir}
        >
          Informar a data da prova (opcional)
        </button>
      ) : (
        <>
          <div className="campo">
            <label htmlFor="data-da-prova">Data da prova objetiva (opcional)</label>
            <input
              ref={campo}
              id="data-da-prova"
              type="date"
              min={amanha}
              value={valor}
              onChange={(e) => {
                setDigitada(e.target.value);
              }}
            />
          </div>
          <p className="dica">
            As revisões não passam da prova, e os pontos mais cobrados voltam na última semana.
          </p>
          {passou && (
            <p role="status" className="dica">
              Escolha uma data depois de hoje.
            </p>
          )}
          <div className="linha-acoes">
            {mudou && valida && (
              <button
                type="button"
                onClick={() => {
                  gravar(valor);
                }}
              >
                Guardar a data
              </button>
            )}
            <button
              type="button"
              className="botao-texto"
              onClick={() => {
                setDigitada(null);
                setAberto(false);
                devolverFoco.current = guardada ? 'mudar' : null;
              }}
            >
              Cancelar
            </button>
          </div>
        </>
      )}
      {falha && (
        <p role="alert" className="aviso falha">
          Não foi possível guardar a data. Nada foi alterado.
        </p>
      )}
    </section>
  );
}
