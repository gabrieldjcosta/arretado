import { AreaVazia } from "@apresentacao/componentes/AreaVazia";

export function Hoje() {
  return (
    <AreaVazia
      titulo="Hoje"
      pergunta="O que faço agora?"
      mensagem="Nenhuma revisão hoje. Quando o Recall existir (F1), a próxima ação aparece aqui."
    />
  );
}
