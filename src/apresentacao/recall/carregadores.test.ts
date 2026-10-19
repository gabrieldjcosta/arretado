import { criarDisciplina, criarPonto } from '../../dominios/pontos';
import { repositorioDeTeste } from '../../testes/repositorio';
import { pontosEDisciplinas } from './carregadores';

describe('pontosEDisciplinas', () => {
  it('não devolve ponto nem disciplina com exclusão lógica', async () => {
    const { repo } = await repositorioDeTeste();
    const viva = await criarDisciplina(repo, 'Execução Penal');
    const morta = await criarDisciplina(repo, 'Civil');
    const p1 = await criarPonto(repo, viva.id, 'Remição');
    const p2 = await criarPonto(repo, viva.id, 'Progressão');
    await repo.colecao('pontos').excluir(p2.id);
    await repo.colecao('disciplinas').excluir(morta.id);

    const { pontos, disciplinas } = await pontosEDisciplinas(repo);
    expect(pontos.map((p) => p.id)).toEqual([p1.id]);
    expect(disciplinas.map((d) => d.id)).toEqual([viva.id]);
  });
});
