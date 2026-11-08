# Abertura do Fio: pulos com tempos próprios e arrasto do ponto com mouse (08/11/2026)

- **Pulos:** a abertura (`fio/m/abertura-voo.ts`) ficou 30% mais lenta e cada pulo tem o seu tempo (tabela fixa `ELASTICO`, sem sorteio), com pausas extras. Calmo e movimento reduzido ficam como estavam; as aberturas de rotina seguem em 40% do tempo (o `ritmo` multiplica tudo).
- **Arrasto (`fio/m/PuxarM.tsx`):** a animação de queda do ponto usava `fill: both` e segurava `transform: none` por cima do `translateY` do arrasto: o ponto não descia e o fio, desenhado à parte, ficava solto. Agora a animação é cancelada ao acabar e ao tocar no ponto. E2E novo: "com movimento vivo, o ponto desce junto com o mouse e o fio o acompanha" (falhava sem a correção).
- **Lição:** `animar()` usa `fill: both`; quem anima um elemento que depois recebe estilo inline precisa cancelar a animação no fim.
