import { useState, type SubmitEvent } from 'react';
import { MODULOS, type Modulo } from '../../../core/modelo';
import { exportarPacote } from '../../../core/pacote';
import { registrarBackup } from '../../../core/persistencia';
import { useRepositorio } from '../../dados/contexto';
import { baixar, ROTULO_MODULO } from './rotulos';

export function Exportar() {
  const repo = useRepositorio();
  const [integral, setIntegral] = useState(true);
  const [modulos, setModulos] = useState<Modulo[]>(['recall']);
  const [comSenha, setComSenha] = useState(false);
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [estado, setEstado] = useState<{
    tipo: 'ocioso' | 'gerando' | 'ok' | 'falha';
    texto?: string;
  }>({ tipo: 'ocioso' });

  const senhaInvalida = comSenha && (senha.length < 8 || senha !== confirmacao);
  const semModulos = !integral && modulos.length === 0;

  const exportar = async (e: SubmitEvent) => {
    e.preventDefault();
    setEstado({ tipo: 'gerando' });
    try {
      const pacote = await exportarPacote(repo, {
        escopo: integral ? { tipo: 'integral' } : { tipo: 'modulos', modulos },
        incluirAnexos: true,
        ...(comSenha ? { senha } : {}),
      });
      baixar(pacote.bytes, pacote.nomeArquivo);
      if (integral) await registrarBackup(repo);
      setSenha('');
      setConfirmacao('');
      setEstado({
        tipo: 'ok',
        texto: `Pacote gerado: ${pacote.nomeArquivo}. Guarde-o fora deste aparelho.`,
      });
    } catch {
      setEstado({ tipo: 'falha', texto: 'Não foi possível gerar o pacote. Nada foi alterado.' });
    }
  };

  return (
    <section className="cartao-bloco" aria-labelledby="t-exportar">
      <h2 id="t-exportar">Exportar</h2>
      <form onSubmit={(e) => void exportar(e)}>
        <fieldset>
          <legend>O que exportar</legend>
          <label className="opcao">
            <input
              type="radio"
              name="escopo"
              checked={integral}
              onChange={() => {
                setIntegral(true);
              }}
            />
            Tudo (recomendado para backup)
          </label>
          <label className="opcao">
            <input
              type="radio"
              name="escopo"
              checked={!integral}
              onChange={() => {
                setIntegral(false);
              }}
            />
            Só alguns módulos
          </label>
          {!integral &&
            MODULOS.map((m) => (
              <label key={m} className="opcao">
                <input
                  type="checkbox"
                  checked={modulos.includes(m)}
                  onChange={(ev) => {
                    setModulos((atual) =>
                      ev.target.checked ? [...atual, m] : atual.filter((x) => x !== m),
                    );
                  }}
                />
                {ROTULO_MODULO[m]}
              </label>
            ))}
        </fieldset>
        <label className="opcao">
          <input
            type="checkbox"
            checked={comSenha}
            onChange={(ev) => {
              setComSenha(ev.target.checked);
            }}
          />
          Proteger com senha (para guardar em nuvem de terceiros)
        </label>
        {comSenha && (
          <>
            <p className="aviso">
              O Arretado não guarda a senha. Sem ela, não há como abrir o arquivo — nem por nós.
            </p>
            <div className="campo">
              <label htmlFor="exp-senha">Senha (mínimo 8 caracteres)</label>
              <input
                id="exp-senha"
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={(ev) => {
                  setSenha(ev.target.value);
                }}
              />
            </div>
            <div className="campo">
              <label htmlFor="exp-confirmacao">Repita a senha</label>
              <input
                id="exp-confirmacao"
                type="password"
                autoComplete="new-password"
                value={confirmacao}
                onChange={(ev) => {
                  setConfirmacao(ev.target.value);
                }}
              />
            </div>
          </>
        )}
        <div className="linha-acoes">
          <button
            type="submit"
            className="principal"
            disabled={estado.tipo === 'gerando' || senhaInvalida || semModulos}
          >
            {estado.tipo === 'gerando' ? 'Gerando…' : 'Exportar'}
          </button>
        </div>
        {estado.texto && (
          <p
            role={estado.tipo === 'falha' ? 'alert' : 'status'}
            className={estado.tipo === 'ok' ? 'sucesso' : 'aviso'}
          >
            {estado.texto}
          </p>
        )}
      </form>
    </section>
  );
}
