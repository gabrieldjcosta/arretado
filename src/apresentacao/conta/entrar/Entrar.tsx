import { useState, type SyntheticEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { entrarNaConta } from '../../../core/persistencia';
import { FalhaDeConta, type SessaoDeConta } from '../../../integracoes/conta';
import { useServicoDeConta } from './ContextoConta';
import { recarregarEm } from '../recarregar';
import { destinoDepoisDeEntrar } from './destino';
import './estilos-conta.css';

/** Versão dos termos de teste da V1; a política v3 definitiva chega no pacote A7. */
export const VERSAO_TERMOS = 'teste-1';

const AVISO_PADRAO = 'Não foi possível entrar agora. Você continua usando o Arretado sem conta.';

const AVISO_DE_ERRO: Record<string, string> = {
  'sem-convite': 'Este e-mail ainda não foi liberado. Você continua usando o Arretado sem conta.',
  'sem-rede': 'Sem conexão agora. Você continua estudando; tente entrar depois.',
  invalido: 'Código inválido ou vencido. Peça um novo.',
  recusado: 'Muitas tentativas. Espere alguns minutos e tente de novo.',
  indisponivel: AVISO_PADRAO,
};

const avisoDe = (motivo: string | null): string | null =>
  motivo ? (AVISO_DE_ERRO[motivo] ?? AVISO_PADRAO) : null;

/** Tela Entrar: Google, ou código de 6 dígitos por e-mail; "Usar sem conta" sempre à vista. */
export function Entrar({
  aoEntrar = recarregarEm,
  prepararConta = (s: SessaoDeConta) => entrarNaConta(s),
  destino = (s: SessaoDeConta) => destinoDepoisDeEntrar(s),
}: {
  aoEntrar?: (destino: string) => void;
  prepararConta?: (sessao: SessaoDeConta) => Promise<void>;
  destino?: (sessao: SessaoDeConta) => Promise<string>;
}) {
  const servico = useServicoDeConta();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [etapa, setEtapa] = useState<'email' | 'codigo'>('email');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(avisoDe(params.get('erro')));

  async function executar(fn: () => Promise<void>) {
    setOcupado(true);
    setAviso(null);
    try {
      await fn();
    } catch (erro) {
      setAviso(avisoDe(erro instanceof FalhaDeConta ? erro.motivo : 'indisponivel'));
    } finally {
      setOcupado(false);
    }
  }

  const google = () => {
    void executar(() => servico.entrarComGoogle());
  };

  const pedirCodigo = (e: SyntheticEvent) => {
    e.preventDefault();
    void executar(async () => {
      await servico.pedirCodigoPorEmail(email);
      setEtapa('codigo');
    });
  };

  const confirmar = (e: SyntheticEvent) => {
    e.preventDefault();
    void executar(async () => {
      const sessao = await servico.confirmarCodigo(email, codigo);
      await prepararConta(sessao);
      // O aceite no servidor não bloqueia a entrada: quem viu o aviso e entrou aceitou os termos de teste.
      await servico.aceitarTermos(VERSAO_TERMOS).catch(() => undefined);
      // Na dúvida, a tela da migração: ela mesma mostra o que há e tem "Agora não".
      aoEntrar(await destino(sessao).catch(() => '#/conta/migracao'));
    });
  };

  return (
    <>
      <h1>Entrar</h1>
      <section aria-labelledby="o-que-sai">
        <h2 id="o-que-sai">O que sai do seu aparelho</h2>
        <ul>
          <li>Seu e-mail e a conta.</li>
          <li>O que o Google informa ao entrar (nome e foto), se você usar o Google.</li>
          <li>Nada do que você estuda: Erros, Cartões, Frases e Sessões ficam no aparelho.</li>
          <li>Só vai uma cópia, cifrada no aparelho, se você pedir.</li>
          <li>Você pode continuar sem conta, sem perder nada.</li>
        </ul>
        <p className="dica">Ao entrar você aceita os termos de teste desta versão.</p>
      </section>

      {aviso && (
        <p className="aviso" role="alert">
          {aviso}
        </p>
      )}

      <div className="entrar-opcoes">
        <button type="button" className="botao principal" onClick={google} disabled={ocupado}>
          Entrar com o Google
        </button>

        {etapa === 'email' ? (
          <form onSubmit={pedirCodigo} className="entrar-form">
            <label htmlFor="entrar-email">Ou receba um código por e-mail</label>
            <input
              id="entrar-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
            />
            <button type="submit" className="botao" disabled={ocupado}>
              Enviar código
            </button>
          </form>
        ) : (
          <form onSubmit={confirmar} className="entrar-form">
            <label htmlFor="entrar-codigo">Código de 6 dígitos enviado para {email}</label>
            <input
              id="entrar-codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value);
              }}
            />
            <div className="linha-acoes">
              <button type="submit" className="botao" disabled={ocupado}>
                Entrar
              </button>
              <button
                type="button"
                className="botao discreto"
                onClick={() => {
                  setEtapa('email');
                  setCodigo('');
                }}
              >
                Trocar e-mail
              </button>
            </div>
          </form>
        )}
      </div>

      <p>
        <Link to="/conta" className="botao discreto">
          Usar sem conta
        </Link>
      </p>
    </>
  );
}
