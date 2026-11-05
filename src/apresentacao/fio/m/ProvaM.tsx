import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { espera, modoAgora } from './anima';
import { TelaM } from './TelaM';

/**
 * As quatro respostas da tela `prova` do mockup. O texto é o dele; o caminho é do app: a carreira leva às normas
 * com que ela começa (`/comecar/:carreira`, que já existe) e "Ainda não sei" ao acervo inteiro.
 */
const PROVAS = [
  { nome: 'Defensoria', apoio: 'SP, banca FCC', para: '/comecar/defensoria-publica' },
  { nome: 'Magistratura', apoio: 'estadual e federal', para: '/comecar/magistratura' },
  { nome: 'Ministério Público', apoio: 'estadual', para: '/comecar/ministerio-publico' },
  { nome: 'Ainda não sei', apoio: 'começo pelo que mais cai', para: '/biblioteca/acervo' },
] as const;

/**
 * "Pra qual prova você estuda?", a tela `prova` do mockup aprovado: uma pergunta só, quatro respostas num fio com
 * um nó em cada, e o ponto de luz da abertura pousa no primeiro nó. Escolher acende o nó e segue, no Vivo depois de
 * 320 ms (o `await espera(320)` do mockup). Sem conta, sem edital: nada se pede além disto.
 */
export function ProvaM() {
  const navegar = useNavigate();
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const vivo = useRef(true);
  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  async function escolher(para: string, nome: string) {
    if (escolhida) return;
    setEscolhida(nome);
    if (modoAgora() === 'normal') await espera(320);
    if (vivo.current) void navegar(para);
  }

  return (
    <TelaM nome="prova">
      <span className="m-olho">Uma pergunta só</span>
      <h1 style={{ marginTop: 10 }}>Pra qual prova você estuda?</h1>
      <div className="m-provas">
        <span className="m-no-prova" aria-hidden="true" />
        {PROVAS.map((p) => (
          <button
            key={p.nome}
            type="button"
            className={escolhida === p.nome ? 'm-conta m-escolhida' : 'm-conta'}
            onClick={() => {
              void escolher(p.para, p.nome);
            }}
          >
            <strong>{p.nome}</strong>
            <small>{p.apoio}</small>
          </button>
        ))}
      </div>
      <div className="m-vazio" />
      <p className="m-quieto">Sem conta, sem edital. Isso fica para depois, se você quiser.</p>
    </TelaM>
  );
}
