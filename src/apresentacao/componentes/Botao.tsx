import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "principal" | "secundario" | "discreto";
};

const ESTILOS = {
  principal: "border-acento bg-acento text-acento-contraste hover:opacity-90",
  secundario: "border-borda bg-superficie hover:bg-borda/60",
  discreto: "border-transparent hover:bg-borda/60",
} as const;

/** Uma ação principal por tela; as demais em variante discreta (§9.1). */
export function Botao({ variante = "secundario", className = "", ...resto }: Props) {
  return (
    <button
      type="button"
      className={`alvo-toque rounded-md border px-4 text-sm font-medium disabled:opacity-50 ${ESTILOS[variante]} ${className}`}
      {...resto}
    />
  );
}
