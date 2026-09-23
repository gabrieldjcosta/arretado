import * as Radix from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  children: ReactNode;
}

/**
 * Um diálogo por ação, nunca em cadeia (§9.1). Sobre primitivo do Radix porque foco preso,
 * Esc, rótulo e restauração do foco ao fechar são exatamente o que costuma sair errado à mão (§11).
 */
export function Dialogo({ aberto, aoFechar, titulo, descricao, children }: Props) {
  return (
    <Radix.Root open={aberto} onOpenChange={(estado) => !estado && aoFechar()}>
      <Radix.Portal>
        <Radix.Overlay className="fixed inset-0 bg-black/40" />
        <Radix.Content
          className="fixed left-1/2 top-1/2 max-h-[85dvh] w-[min(34rem,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg border border-borda bg-superficie p-5 shadow-lg"
          aria-describedby={descricao ? undefined : "descricao-ausente"}
        >
          <Radix.Title className="text-lg font-semibold">{titulo}</Radix.Title>
          {descricao ? (
            <Radix.Description className="mt-1 text-sm text-texto-atenuado">
              {descricao}
            </Radix.Description>
          ) : (
            <Radix.Description id="descricao-ausente" className="sr-only">
              {titulo}
            </Radix.Description>
          )}
          <div className="mt-4">{children}</div>
          <Radix.Close className="alvo-toque absolute right-3 top-3 rounded-md px-3 text-texto-atenuado hover:bg-borda/60">
            Fechar
          </Radix.Close>
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  );
}
