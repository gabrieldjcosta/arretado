// Conta › Sincronização (F4-B, B4; plano §0 e §4): os três estados, a posse do aparelho, os seus
// aparelhos, "Sincronizar agora" e os Problemas. Vocabulário: Aparelho, Problema, Conflito.
import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { FalhaDeConta } from '../../integracoes/conta';
import { estadoDaSincronizacao, ROTULO_DO_ESTADO } from '../../core/sincronizacao/estado';
import { useConectado } from '../componentes/conexao';
import { Selo } from '../componentes/Selo';
import { useDados } from '../dados/contexto';
import { formatarQuando } from '../recall/rotulos';
import { useSincronizacao } from './contexto';
import { ROTULO_DA_POSSE } from './rotulos';
import './estilos-sincronizacao.css';

const O_QUE_MUDA = [
  'O que você estuda passa a ser guardado também na sua conta e aparece em todos os seus Aparelhos: Erros, Cartões, Normas, grifos, notas, Revisões, Sessões e Dias.',
  'Esses dados ficam legíveis só por você no banco. Por não serem cifrados com uma frase sua, a equipe que administra o serviço consegue tecnicamente lê-los; isso só acontece para manter o serviço ou quando você pedir ajuda.',
  'Não escreva dados de saúde nas suas notas: elas vão para o servidor. Não perguntamos nem guardamos diagnóstico.',
  'Tema, letra e aparência ficam em cada Aparelho. O conteúdo das leis não sobe, só a referência.',
  'É uma função de teste: pode falhar. Guarde uma cópia em Conta › Dados mesmo assim. Sair ou excluir a conta continua em Conta, a qualquer momento.',
];

function Ligar() {
  const sync = useSincronizacao();
  const [fase, setFase] = useState<'pedido' | 'ligando' | 'recusado' | 'falhou'>('pedido');
  if (!sync) return null;
  const ligar = async () => {
    setFase('ligando');
    try {
      await sync.ligar();
    } catch (e: unknown) {
      setFase(e instanceof FalhaDeConta && e.motivo === 'sem-convite' ? 'recusado' : 'falhou');
    }
  };
  return (
    <section className="cartao-bloco" aria-labelledby="t-ligar-sync">
      <h2 id="t-ligar-sync">Ligar a sincronização</h2>
      <p>Com ela ligada, seus Aparelhos ficam iguais sem você fazer nada.</p>
      <ol>
        {O_QUE_MUDA.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>
      <p className="dica">
        Ao ligar, você aceita este texto e a política de privacidade versão 4. Leia a política em{' '}
        <Link to="/conta/privacidade">Conta › Privacidade</Link>.
      </p>
      {fase === 'recusado' && (
        <p className="aviso" role="alert">
          Sua conta ainda não foi liberada para sincronizar. Nada mudou neste Aparelho.
        </p>
      )}
      {fase === 'falhou' && (
        <p className="aviso" role="alert">
          Não foi possível ligar agora (sem conexão ou servidor indisponível). Tente de novo mais
          tarde; nada mudou neste Aparelho.
        </p>
      )}
      <div className="linha-acoes">
        <button
          type="button"
          className="botao"
          disabled={fase === 'ligando'}
          onClick={() => {
            void ligar();
          }}
        >
          {fase === 'ligando' ? 'Ligando…' : 'Ligar a sincronização'}
        </button>
      </div>
    </section>
  );
}

function Aparelhos() {
  const aparelhos = useDados(useCallback((r) => r.colecao('aparelhos').todosDoUsuario(), []));
  const lista = aparelhos.dados ?? [];
  if (lista.length === 0) return null;
  return (
    <section className="cartao-bloco" aria-labelledby="t-aparelhos">
      <h2 id="t-aparelhos">Seus Aparelhos</h2>
      <ul className="lista-simples">
        {lista.map((a) => (
          <li key={a.id}>
            <strong>{a.nome}</strong>
            <span className="dica"> {a.plataforma.slice(0, 60)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Sincronizacao() {
  const sync = useSincronizacao();
  const conectado = useConectado();
  const [editando, setEditando] = useState(false);
  if (!sync) return null;
  const { estado } = sync;

  if (estado.ligada === null) {
    return (
      <>
        <h1>Sincronização</h1>
        <p className="dica" role="status">
          Conferindo a sua conta…
        </p>
      </>
    );
  }
  if (estado.parada === 'sem-conta') {
    return (
      <>
        <h1>Sincronização</h1>
        <p>
          A sincronização entre Aparelhos pede uma conta.{' '}
          <Link to="/conta/entrar">Entrar com uma conta</Link>
        </p>
      </>
    );
  }
  if (!estado.ligada) {
    return (
      <>
        <h1>Sincronização</h1>
        <Ligar />
      </>
    );
  }

  const tres = estadoDaSincronizacao({
    pendentes: estado.pendentes,
    ultimaRodada: estado.ultimaRodada,
    conflitos: estado.conflitos,
  });
  const posse = estado.posse;
  const editarAqui = async () => {
    setEditando(true);
    try {
      await sync.editarAqui();
    } finally {
      setEditando(false);
    }
  };

  return (
    <>
      <h1>Sincronização</h1>
      <section className="cartao-bloco" aria-labelledby="t-estado-sync">
        <h2 id="t-estado-sync">Estado</h2>
        <p className="estado-sync" role="status">
          <Selo>{ROTULO_DO_ESTADO[tres]}</Selo>
          {estado.pendentes > 0 && (
            <span className="dica">
              {' '}
              {estado.pendentes === 1
                ? '1 mudança a enviar.'
                : `${String(estado.pendentes)} mudanças a enviar.`}
            </span>
          )}
        </p>
        <p className="dica">
          {estado.ultimaRodada
            ? `Última sincronização: ${formatarQuando(estado.ultimaRodada.em)}.`
            : 'Ainda não sincronizou nesta abertura.'}
          {!conectado && ' Sem conexão: o envio espera a rede.'}
        </p>
        <div className="linha-acoes">
          <button
            type="button"
            className="botao"
            onClick={() => {
              sync.sincronizarAgora();
            }}
          >
            Sincronizar agora
          </button>
        </div>
      </section>

      <section className="cartao-bloco" aria-labelledby="t-posse">
        <h2 id="t-posse">Quem está editando</h2>
        <p>{ROTULO_DA_POSSE[posse.tipo]}</p>
        {posse.tipo === 'de-outro' && (
          <>
            {posse.ultimoSinal && (
              <p className="dica">
                Último sinal do outro Aparelho: {formatarQuando(posse.ultimoSinal)}.
              </p>
            )}
            <div className="linha-acoes">
              <button
                type="button"
                className="botao"
                disabled={editando}
                onClick={() => {
                  void editarAqui();
                }}
              >
                {editando ? 'Passando…' : 'Editar neste aparelho'}
              </button>
            </div>
          </>
        )}
      </section>

      {(estado.conflitos > 0 ||
        estado.emQuarentena > 0 ||
        (estado.ultimaRodada && !estado.ultimaRodada.ok)) && (
        <section className="cartao-bloco" aria-labelledby="t-problemas-sync">
          <h2 id="t-problemas-sync">Precisa de você</h2>
          {estado.conflitos > 0 && (
            <p>
              <Link to="/conta/conflitos">
                {estado.conflitos === 1
                  ? '1 Conflito para decidir'
                  : `${String(estado.conflitos)} Conflitos para decidir`}
              </Link>
              . Duas versões do mesmo registro esperam a sua escolha; nada foi sobrescrito.
            </p>
          )}
          {estado.emQuarentena > 0 && (
            <p>
              {estado.emQuarentena === 1
                ? '1 mudança recebida ficou de lado'
                : `${String(estado.emQuarentena)} mudanças recebidas ficaram de lado`}{' '}
              (Problema: o app não conseguiu aplicá-las). Atualizar o app costuma resolver; nada foi
              perdido.
            </p>
          )}
          {estado.ultimaRodada && !estado.ultimaRodada.ok && (
            <p className="aviso" role="status">
              Problema na última tentativa: {estado.ultimaRodada.falha ?? 'sem detalhe'}. O app
              tenta de novo sozinho.
            </p>
          )}
        </section>
      )}

      <Aparelhos />
    </>
  );
}
