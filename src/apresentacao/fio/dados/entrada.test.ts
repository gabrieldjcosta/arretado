import type { Bloco } from '../../../core/seguranca/sanitizador';
import { criarCiclo } from '../../../dominios/ciclos';
import { escolherMateria } from '../../../dominios/fio';
import { abrirNorma } from '../../../dominios/legislacao/leitor';
import { marcarLidoAte } from '../../../dominios/legislacao/leituras';
import { criarRascunho, publicarVersao } from '../../../dominios/legislacao/servico';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { registrarArtigosFeitos } from '../../biblioteca/mapa/feitos';
import { fonteIncidenciaPadrao } from '../../dados/fonteIncidenciaContexto';
import { montarEntradaDoFio } from './entrada';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('LEI Nº 7.210, DE 11 DE JULHO DE 1984.'),
  linha('Institui a Lei de Execução Penal.'),
  linha(
    'O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:',
  ),
  linha('Art. 1º A execução penal tem por objetivo efetivar as disposições da sentença.'),
  linha('Art. 2º O prazo de recurso é de 30 (trinta) dias.'),
  linha('Art. 3º Ao condenado são assegurados os direitos não atingidos pela sentença.'),
  linha('Art. 4º O Estado deverá recorrer à cooperação da comunidade.'),
];

const opcoes = (extra: { etapasFeitas?: number; materiaAberta?: string } = {}) => ({
  fonte: fonteIncidenciaPadrao,
  etapasFeitas: 0,
  ...extra,
});

async function cenario() {
  const { repo } = await repositorioDeTeste();
  const disciplina = await repo.colecao('disciplinas').criar({ nome: 'Execução Penal' });
  const { versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
  const { norma } = await publicarVersao(repo, versao.id);
  await repo
    .colecao('vinculosDisciplina')
    .criar({ normaId: norma.id, disciplinaId: disciplina.id });
  return { repo, disciplina, norma };
}

describe('a entrada do Fio, montada do que o app já sabe', () => {
  it('um app vazio não conhece nenhuma matéria', async () => {
    const { repo } = await repositorioDeTeste();
    const e = await montarEntradaDoFio(repo, opcoes());
    expect(e.materias).toEqual([]);
    expect(escolherMateria(e)).toBeUndefined();
    expect(e.vencidos).toBe(0);
    expect(e.tarefas).toEqual([]);
  });

  it('a matéria traz os artigos da norma vinculada, em ordem, com os grifos contados', async () => {
    const { repo, disciplina, norma } = await cenario();
    const e = await montarEntradaDoFio(repo, opcoes());
    expect(e.materias).toHaveLength(1);
    const materia = e.materias[0];
    expect(materia?.id).toBe(disciplina.id);
    expect(materia?.nome).toBe('Execução Penal');
    const n = materia?.normas[0];
    expect(n?.id).toBe(norma.id);
    expect(n?.artigos.map((a) => a.rotulo)).toEqual(['Art. 1º', 'Art. 2º', 'Art. 3º', 'Art. 4º']);
    // O prazo de "30 (trinta) dias" é um Destaque; os outros artigos não têm nenhum.
    expect(n?.artigos.map((a) => a.grifos > 0)).toEqual([false, true, false, false]);
    expect(n?.artigos.every((a) => !a.lido)).toBe(true);
    // Sem arquivo do Mapa (norma fora do acervo), ninguém tem posição: vale a ordem do código.
    expect(n?.artigos.every((a) => a.posicaoNoMapa === undefined)).toBe(true);
  });

  it('o "lido até" e os artigos feitos pelo mapa contam como lidos', async () => {
    const { repo, norma } = await cenario();
    const aberta = await abrirNorma(repo, norma.id);
    const artigos = aberta.nos.filter((no) => no.dispositivo.tipo === 'artigo');
    await marcarLidoAte(repo, norma.id, artigos[1]?.dispositivo.id ?? '');
    registrarArtigosFeitos(norma.id, [artigos[3]?.dispositivo.id ?? '']);
    const e = await montarEntradaDoFio(repo, opcoes());
    expect(e.materias[0]?.normas[0]?.artigos.map((a) => a.lido)).toEqual([true, true, false, true]);
  });

  it('só abre as normas da matéria da vez e da etapa aberta', async () => {
    const { repo } = await cenario();
    const outra = await repo.colecao('disciplinas').criar({ nome: 'Civil', ordem: 2 });
    const { versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    const { norma: nova } = await publicarVersao(repo, versao.id);
    await repo.colecao('vinculosDisciplina').criar({ normaId: nova.id, disciplinaId: outra.id });

    const sem = await montarEntradaDoFio(repo, opcoes());
    const civilSem = sem.materias.find((m) => m.id === outra.id);
    expect(civilSem?.normas[0]?.artigos).toEqual([]);

    const com = await montarEntradaDoFio(repo, opcoes({ materiaAberta: outra.id }));
    expect(com.materias.find((m) => m.id === outra.id)?.normas[0]?.artigos).toHaveLength(4);
  });

  it('o vínculo com trecho leva só os artigos do trecho', async () => {
    const { repo, disciplina, norma } = await cenario();
    // Troca o vínculo inteiro por um do Art. 2º ao Art. 3º.
    const vinculos = await repo.colecao('vinculosDisciplina').todosDoUsuario();
    for (const v of vinculos) await repo.colecao('vinculosDisciplina').excluir(v.id);
    const aberta = await abrirNorma(repo, norma.id);
    const enderecos = aberta.nos
      .filter((no) => no.dispositivo.tipo === 'artigo')
      .map((no) => no.dispositivo.endereco);
    await repo.colecao('vinculosDisciplina').criar({
      normaId: norma.id,
      disciplinaId: disciplina.id,
      trecho: { inicioEndereco: enderecos[1] ?? '', fimEndereco: enderecos[2] ?? '' },
    });
    const e = await montarEntradaDoFio(repo, opcoes());
    expect(e.materias[0]?.normas[0]?.artigos.map((a) => a.rotulo)).toEqual(['Art. 2º', 'Art. 3º']);
  });

  it('a matéria sem norma publicada segue na lista, sem normas', async () => {
    const { repo } = await repositorioDeTeste();
    await repo.colecao('disciplinas').criar({ nome: 'Penal' });
    const e = await montarEntradaDoFio(repo, opcoes());
    expect(e.materias.map((m) => [m.nome, m.normas.length])).toEqual([['Penal', 0]]);
  });

  it('o Ciclo anda uma matéria por etapa pousada, sem gravar nada nele', async () => {
    const { repo, disciplina } = await cenario();
    const outra = await repo.colecao('disciplinas').criar({ nome: 'Civil', ordem: 2 });
    await criarCiclo(repo, {
      nome: 'Volta',
      modelo: 'manual',
      pesos: [
        { disciplinaId: disciplina.id, peso: 1 },
        { disciplinaId: outra.id, peso: 1 },
      ],
    });
    const e0 = await montarEntradaDoFio(repo, opcoes({ etapasFeitas: 0 }));
    const e1 = await montarEntradaDoFio(repo, opcoes({ etapasFeitas: 1 }));
    expect(e0.ciclo?.indice).toBe(0);
    expect(e1.ciclo?.indice).toBe(1);
    expect(escolherMateria(e1)?.id).toBe(outra.id);
  });
});
