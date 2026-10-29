import indexHtml from '../../index.html?raw';
import { CORPO } from './componentes/ze/geometria';

// A tela de carregamento é HTML e CSS do index.html, fora do pacote: o que não pode escorregar vai aqui.
const documento = new DOMParser().parseFromString(indexHtml, 'text/html');
const tela = documento.getElementById('carregamento');

describe('tela de carregamento no index.html', () => {
  it('é um status que vem antes do #raiz, para pintar antes do pacote', () => {
    expect(tela).not.toBeNull();
    expect(tela?.getAttribute('role')).toBe('status');
    const raiz = documento.getElementById('raiz');
    expect(raiz).not.toBeNull();
    expect(
      tela && raiz && tela.compareDocumentPosition(raiz) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('é só HTML, SVG e CSS externo: a CSP (style-src e script-src self) não deixa mais nada', () => {
    expect(tela?.querySelectorAll('[style], style, script, [onload], [onclick]')).toHaveLength(0);
    expect(
      documento.head.querySelector('link[rel="stylesheet"][href="/carregamento.css"]'),
    ).not.toBeNull();
  });

  it('as camadas do contorno do Zé usam o mesmo desenho', () => {
    const contornos = [...(tela?.querySelectorAll('path[pathLength]') ?? [])]
      .map((p) => p.getAttribute('d') ?? '')
      .filter((d) => d.length > 100);
    // Aura, faixa do dia, faixa da noite, linha e as duas luzes que viajam; mais o miolo (sem pathLength).
    expect(contornos).toHaveLength(6);
    expect(new Set(contornos).size).toBe(1);
    expect(tela?.querySelector('.carr-miolo')?.getAttribute('d')).toBe(contornos[0]);
  });

  it('o contorno é o do Zé do app: o d das camadas é o contornoZe(ZP) do componente (critério 24)', () => {
    const contornos = [...(tela?.querySelectorAll('path[pathLength]') ?? [])]
      .map((p) => p.getAttribute('d') ?? '')
      .filter((d) => d.length > 100);
    expect(contornos.length).toBeGreaterThan(0);
    for (const d of contornos) expect(d).toBe(CORPO.d);
    expect(tela?.querySelector('.carr-miolo')?.getAttribute('d')).toBe(CORPO.d);
  });

  it('o texto da espera é calmo: sem cobrança nem urgência', () => {
    const texto = tela?.textContent ?? '';
    expect(texto).toContain('Abrindo o Arretado');
    expect(texto).not.toMatch(/parou|atrasad|perdeu|rápido|urgente/i);
  });
});
