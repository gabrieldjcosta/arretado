// Mensagem de falha de gravação mostrada na tela: a mensagem da edição inválida (ponto ou
// tarefa) quando houver; para qualquer outra falha, a frase genérica de "nada foi alterado".
import { EdicaoInvalida } from '../../dominios/pontos';
import { TarefaInvalida } from '../../dominios/tarefas';

export function mensagem(e: unknown): string {
  if (e instanceof EdicaoInvalida || e instanceof TarefaInvalida) return e.message;
  return 'Não foi possível salvar. Nada foi alterado.';
}