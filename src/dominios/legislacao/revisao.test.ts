import type { Bloco } from '../../core/seguranca/sanitizador';
import { textoParaBlocos } from '../../core/seguranca/sanitizador';
import { repositorioDeTeste } from '../../testes/repositorio';
import {
  confirmarDispositivos,
  corrigirDispositivo,
  CorrecaoInvalida,
  listarAConfirmar,
} from './revisao';
import {
  criarRascunho,
  publicarVersao,
  PublicacaoBloqueada,
  RascunhoIndisponivel,
  verificarPublicacao,
} from './servico';

const TEXTO = [
  'LEI Nº 1.234, DE 5 DE MAIO DE 2020.',
  'Art. 1º Esta Lei trata do teste.',
  'Parágrafo único. O teste é contínuo.',
  'Art. 2º São deveres:',
  'I - estudar;',
  'II - revisar.',
].join('\n');

async function rascunhoDeTextoPuro() {
  const { repo } = await repositorioDeTeste();
  const blocos: Bloco[] = textoParaBlocos(TEXTO);
  const criado = await criarRascunho(repo, { blocos, origemEntrada: 'texto' });
  return { repo, versaoId: criado.versao.id };
}

describe('revisão do rascunho (10.1)', () => {
  it('lista os a confirmar com contexto e prévia, por página', async () => {
    const { repo, versaoId } = await rascunhoDeTextoPuro();
    const { total, itens } = await listarAConfirmar(repo, versaoId);
    expect(total).toBeGreaterThan(0);
    expect(itens).toHaveLength(total);
    const inciso = itens.find((i) => i.endereco === 'art2.incI');
    expect(inciso?.contexto).toBe('Art. 2º');
    expect(inciso?.previa).toContain('estudar');
    const pagina = await listarAConfirmar(repo, versaoId, { desde: 1, quantidade: 1 });
    expect(pagina.total).toBe(total);
    expect(pagina.itens.map((i) => i.dispositivoId)).toEqual([itens[1]?.dispositivoId]);
  });

  it('confirma em lote e libera a publicação sem aceite', async () => {
    const { repo, versaoId } = await rascunhoDeTextoPuro();
    const antes = await verificarPublicacao(repo, versaoId);
    expect(antes.aConfirmar).toBeGreaterThan(0);
    await expect(publicarVersao(repo, versaoId)).rejects.toBeInstanceOf(PublicacaoBloqueada);
    expect(await confirmarDispositivos(repo, versaoId)).toBe(antes.aConfirmar);
    expect(await confirmarDispositivos(repo, versaoId)).toBe(0);
    expect((await verificarPublicacao(repo, versaoId)).aConfirmar).toBe(0);
    await publicarVersao(repo, versaoId);
  });

  it('confirma só os ids pedidos', async () => {
    const { repo, versaoId } = await rascunhoDeTextoPuro();
    const { total, itens } = await listarAConfirmar(repo, versaoId);
    const primeiro = itens[0];
    if (!primeiro) throw new Error('sem item');
    expect(await confirmarDispositivos(repo, versaoId, [primeiro.dispositivoId])).toBe(1);
    expect((await listarAConfirmar(repo, versaoId)).total).toBe(total - 1);
  });

  it('corrige o texto e o rótulo e confirma; o resto fica', async () => {
    const { repo, versaoId } = await rascunhoDeTextoPuro();
    const { itens } = await listarAConfirmar(repo, versaoId);
    const alvo = itens.find((i) => i.endereco === 'art2.incI');
    if (!alvo) throw new Error('sem inciso');
    await corrigirDispositivo(repo, versaoId, alvo.dispositivoId, {
      texto: 'estudar todos os dias;\nsem faltar',
      rotulo: 'I',
    });
    const depois = await listarAConfirmar(repo, versaoId);
    expect(depois.itens.some((i) => i.dispositivoId === alvo.dispositivoId)).toBe(false);
    const [texto] = await repo
      .colecao('textosDispositivo')
      .obterPorChaves('[versaoId+dispositivoId]', [[versaoId, alvo.dispositivoId]]);
    expect(texto?.trechos).toEqual([
      { texto: 'estudar todos os dias;' },
      { texto: '\n' },
      { texto: 'sem faltar' },
    ]);
    const dispositivo = await repo.colecao('dispositivos').obter(alvo.dispositivoId);
    expect(dispositivo?.confianca).toBe('alta');
    expect(dispositivo?.endereco).toBe('art2.incI');
  });

  it('recusa texto longo demais e dispositivo de outro rascunho; publicada não revisa', async () => {
    const { repo, versaoId } = await rascunhoDeTextoPuro();
    const { itens } = await listarAConfirmar(repo, versaoId);
    const id = itens[0]?.dispositivoId ?? '';
    await expect(
      corrigirDispositivo(repo, versaoId, id, { texto: 'x'.repeat(200_001) }),
    ).rejects.toBeInstanceOf(CorrecaoInvalida);
    await expect(
      corrigirDispositivo(repo, versaoId, 'nao-existe', { texto: 'a' }),
    ).rejects.toBeInstanceOf(CorrecaoInvalida);
    await confirmarDispositivos(repo, versaoId);
    await publicarVersao(repo, versaoId);
    await expect(listarAConfirmar(repo, versaoId)).rejects.toBeInstanceOf(RascunhoIndisponivel);
    await expect(confirmarDispositivos(repo, versaoId)).rejects.toBeInstanceOf(
      RascunhoIndisponivel,
    );
  });
});
