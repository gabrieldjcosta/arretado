# Especificação de código do Gabriel (14/10/2026, 11:18 UTC)

Texto como o Gabriel mandou, sem edição (só os `&lt;`/`&gt;` do envio viraram `<`/`>`). Origem: conversa no Gemini
(`https://share.gemini.google/TG0j5Eez0Spd`, não acessível do ambiente do Claude: o domínio não resolve). Como cada
parte entra no app: [`leia-me.md`](leia-me.md) e a decisão D-D4 em [`../../decisoes-design.md`](../../decisoes-design.md).

> Especificação de código — sistema de botões e cards

## Botões e paleta

```ts
// Especificação de classes/estilos (CSS Variables + React/TypeScript) para src/apresentacao/componentes-comuns/Botao.tsx
export const TOKENS_ARRETADO = {
  colors: {
    areia: '#EAD2B0',       // RGB: 234, 210, 176 — Quadros secundários e superfícies quentes
    palhaBg: '#F6F1E6',     // Fundo geral claro (derivado suave da Areia para conforto de leitura)
    terracota: '#963417',   // RGB: 150, 52, 23  — CTA Primário (Modo Claro) e alertas de foco
    caatinga: '#3B3F21',    // RGB: 59, 63, 33   — Card Hero principal e botão Guardar
    acqua: '#628981',       // RGB: 98, 137, 129 — Indicadores de Cartões e progresso calmo
    solace: '#CF893A',      // RGB: 207, 137, 58 — CTA Primário sobre fundo Caatinga/Escuro e Frases
    noiteBg: '#16130F',     // Fundo geral escuro
    noiteCard: '#251F19',   // Card Hero no modo escuro
  },
  buttons: {
    // 1. Botão Primário Compacto (Substitui a pílula amarela larga)
    primary: `
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      min-height: 44px; padding: 0 20px; border-radius: 12px;
      font-weight: 600; font-size: 0.9375rem; letter-spacing: -0.01em;
      transition: transform 140ms ease, background-color 140ms ease, box-shadow 140ms ease;
      box-shadow: 0 2px 6px rgba(22, 19, 15, 0.14);
    `,
    // 2. Ação Secundária Silenciosa (Lado a lado com o primário, sem caixa pesada)
    ghostInline: `
      display: inline-flex; align-items: center; min-height: 44px; padding: 0 12px;
      border-radius: 10px; font-weight: 500; font-size: 0.875rem;
      color: inherit; opacity: 0.82; text-decoration: underline; text-underline-offset: 4px;
    `,
    // 3. Linha de Ação Interativa (Substitui botões empilhados em "Por onde começar?" e Modais)
    actionRow: `
      display: flex; align-items: center; justify-content: space-between;
      width: 100%; min-height: 52px; padding: 10px 14px;
      border-radius: 12px; border: 1px solid rgba(59, 63, 33, 0.12);
      background: rgba(255, 255, 255, 0.45);
      transition: background-color 140ms ease, transform 140ms ease;
    `
  }
};
```

## Elementos vetoriais

```tsx
// src/apresentacao/componentes-comuns/ElementosArretado.tsx
import React from 'react';

export interface ElementoProps {
  size?: number;
  className?: string;
}

const STROKE = '#2B1B12';

// 1. Dupla de Cactos (Grande + Pequeno com nervuras verticais e contorno fino)
export const ElementoCactos: React.FC<ElementoProps> = ({ size = 64, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
    {/* Cacto Principal */}
    <path d="M26 72V18C26 12.5 30.5 8 36 8C41.5 8 46 12.5 46 18V72H26Z" fill="#6F9456" stroke={STROKE} strokeWidth="2.2" />
    <path d="M26 48H18C12.5 48 8 43.5 8 38V28C8 24.7 10.7 22 14 22C17.3 22 20 24.7 20 28V36H26" fill="#6F9456" stroke={STROKE} strokeWidth="2.2" />
    <path d="M46 42H52C57.5 42 62 37.5 62 32V24C62 20.7 59.3 18 56 18C52.7 18 50 20.7 50 24V30H46" fill="#6F9456" stroke={STROKE} strokeWidth="2.2" />
    <line x1="33" y1="12" x2="33" y2="72" stroke={STROKE} strokeWidth="1.5" />
    <line x1="39" y1="12" x2="39" y2="72" stroke={STROKE} strokeWidth="1.5" />
    {/* Cacto Menor */}
    <path d="M60 72V56C60 53.2 62.2 51 65 51C67.8 51 70 53.2 70 56V72H60Z" fill="#6F9456" stroke={STROKE} strokeWidth="2" />
  </svg>
);

// 2. Lâmpada de Estudo (Card "Estudando!")
export const ElementoLampada: React.FC<ElementoProps> = ({ size = 44, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <path d="M32 14C22.6 14 15 21.6 15 31C15 36.8 17.9 41.9 22.3 45L24 50H40L41.7 45C46.1 41.9 49 36.8 49 31C49 21.6 41.4 14 32 14Z" fill="#FAD44C" stroke={STROKE} strokeWidth="2.2" />
    <path d="M29 50L27 34C25 34 24 32 25 30C26 28 29 29 32 32C35 29 38 28 39 30C40 32 39 34 37 34L35 50" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" />
    <rect x="25" y="50" width="14" height="7" rx="3" fill="#6B4C3B" stroke={STROKE} strokeWidth="2" />
    <g stroke={STROKE} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3">
      <line x1="32" y1="3" x2="32" y2="9" />
      <line x1="12" y1="12" x2="16" y2="16" />
      <line x1="52" y1="12" x2="48" y2="16" />
      <line x1="5" y1="31" x2="11" y2="31" />
      <line x1="53" y1="31" x2="59" y2="31" />
    </g>
  </svg>
);

// 3. Símbolos de Distração ("?" Terracota, "♪" Verde e "♫" Solace do Card "Distraído...")
export const ElementoDistracao: React.FC<ElementoProps> = ({ size = 64, className }) => (
  <svg width={size} height={size * 0.6} viewBox="0 0 100 60" fill="none" className={className} aria-hidden="true">
    {/* "?" Terracota */}
    <path d="M12 20C12 12 18 7 26 7C34 7 40 12 40 20C40 26 35 30 30 33C27 35 26 37 26 41H19C19 35 21 31 25 28C29 25 32 23 32 19C32 15 29 13 25 13C21 13 19 16 19 20H12Z" fill="#C95B32" stroke={STROKE} strokeWidth="2.2" />
    <circle cx="22.5" cy="50" r="4.5" fill="#C95B32" stroke={STROKE} strokeWidth="2.2" />
    {/* "♪" Verde */}
    <path d="M56 44V14C62 16 68 22 66 30C64 25 60 22 56 22V44Z" fill="#6F9456" stroke={STROKE} strokeWidth="2.2" strokeLinejoin="round" />
    <ellipse cx="51" cy="45" rx="5.5" ry="4.2" fill="#6F9456" stroke={STROKE} strokeWidth="2.2" />
    {/* "♫" Solace */}
    <path d="M78 46V16L96 12V42" stroke={STROKE} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M78 16L96 12V18L78 22V16Z" fill="#E6A13C" stroke={STROKE} strokeWidth="2" />
    <ellipse cx="74" cy="47" rx="5" ry="3.8" fill="#E6A13C" stroke={STROKE} strokeWidth="2.2" />
    <ellipse cx="92" cy="43" rx="5" ry="3.8" fill="#E6A13C" stroke={STROKE} strokeWidth="2.2" />
  </svg>
);
```
