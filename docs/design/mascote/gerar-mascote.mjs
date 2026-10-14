// Gera as poses do mascote em SVG vetorial plano (uso: node gerar-mascote.mjs <pasta>).
import { mkdirSync, writeFileSync } from 'node:fs';

const C = {
  fur: '#ec8c2a', furDark: '#cf6d1d', furLight: '#f6ad55', hat: '#8a4b2a', hatDark: '#6c3a1f', hatLight: '#b88459',
  scarf: '#c23b2b', scarfDark: '#9c2d21', ink: '#4a2515', line: '#5a2a17', white: '#fffbf2', pad: '#b9561a',
};
const stroke = (c, w) => `stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

const ears = (tilt = 0) => `
  <g transform="rotate(${tilt} 200 150)">
    <path d="M124,110 C86,114 68,172 90,216 C112,230 136,198 140,140 Z" fill="${C.furDark}"/>
    <path d="M276,110 C314,114 332,172 310,216 C288,230 264,198 260,140 Z" fill="${C.furDark}"/>
  </g>`;

const headBase = () => `
  <ellipse cx="200" cy="150" rx="88" ry="80" fill="${C.fur}"/>
  <ellipse cx="200" cy="184" rx="42" ry="30" fill="${C.furLight}"/>
  <ellipse cx="200" cy="168" rx="15" ry="10.5" fill="${C.ink}"/>
  <ellipse cx="195" cy="165" rx="4" ry="2.4" fill="#fff" opacity=".5"/>`;

const hat = (rot = 0, dx = 0, dy = 0) => `
  <g transform="translate(${dx} ${dy}) rotate(${rot} 200 100)">
    <ellipse cx="200" cy="100" rx="110" ry="13" fill="${C.hatDark}"/>
    <path d="M120,100 C118,36 282,36 280,100 C250,92 150,92 120,100 Z" fill="${C.hat}"/>
    <path d="M122,92 C150,84 250,84 278,92 L279,100 C250,92 150,92 121,100 Z" fill="${C.hatLight}" opacity=".85"/>
    <rect x="193" y="52" width="14" height="14" rx="2" transform="rotate(45 200 59)" fill="${C.hatLight}"/>
    <circle cx="152" cy="74" r="4" fill="${C.hatLight}"/><circle cx="248" cy="74" r="4" fill="${C.hatLight}"/>
  </g>`;

const scarf = () => `
  <path d="M126,212 Q200,248 274,212 L252,242 L200,296 L148,242 Z" fill="${C.scarf}"/>
  <path d="M150,242 L200,296 L200,254 Z" fill="${C.scarfDark}" opacity=".35"/>`;

const eyesGlasses = () => `
  <g ${stroke(C.line, 6)} fill="${C.white}">
    <circle cx="156" cy="138" r="27"/><circle cx="244" cy="138" r="27"/>
    <path d="M183,136 Q200,128 217,136" fill="none"/>
  </g>
  <circle cx="160" cy="142" r="9" fill="${C.ink}"/><circle cx="240" cy="142" r="9" fill="${C.ink}"/>
  <circle cx="163" cy="139" r="3" fill="#fff"/><circle cx="243" cy="139" r="3" fill="#fff"/>`;

const eyesOpen = (px = 0, py = 0) => `
  <ellipse cx="160" cy="138" rx="19" ry="21" fill="${C.white}"/><ellipse cx="240" cy="138" rx="19" ry="21" fill="${C.white}"/>
  <circle cx="${160 + px}" cy="${138 + py}" r="9" fill="${C.ink}"/><circle cx="${240 + px}" cy="${138 + py}" r="9" fill="${C.ink}"/>
  <circle cx="${163 + px}" cy="${135 + py}" r="3" fill="#fff"/><circle cx="${243 + px}" cy="${135 + py}" r="3" fill="#fff"/>`;

const eyesHappy = () => `
  <path d="M138,142 Q158,118 178,142" fill="none" ${stroke(C.ink, 7)}/>
  <path d="M222,142 Q242,118 262,142" fill="none" ${stroke(C.ink, 7)}/>`;

const brows = (tilt = 3) => `
  <path d="M138,${108 + tilt} L178,${104}" ${stroke(C.ink, 7)} fill="none"/>
  <path d="M222,104 L262,${108 + tilt}" ${stroke(C.ink, 7)} fill="none"/>`;

const mouth = {
  neutral: `<path d="M184,196 Q200,206 216,196" fill="none" ${stroke(C.ink, 4.5)}/>`,
  small: `<ellipse cx="200" cy="200" rx="7" ry="9" fill="${C.ink}"/>`,
  smile: `<path d="M172,186 Q200,226 228,186 Z" fill="${C.ink}"/><path d="M186,205 Q200,222 214,205 Q200,196 186,205 Z" fill="#e9705f"/>`,
  soft: `<path d="M176,190 Q200,214 224,190" fill="none" ${stroke(C.ink, 5)}/>`,
};

const sittingBody = (withLegs = true) => `
  <path d="M292,380 C352,372 366,316 340,282" fill="none" ${stroke(C.fur, 24)}/>
  <path d="M140,205 C118,262 82,322 92,386 Q98,408 130,408 H270 Q302,408 308,386 C318,322 282,262 260,205 Z" fill="${C.fur}"/>
  ${withLegs ? `
  <rect x="146" y="246" width="30" height="154" rx="15" fill="${C.fur}" ${stroke(C.furDark, 3)}/>
  <rect x="224" y="246" width="30" height="154" rx="15" fill="${C.fur}" ${stroke(C.furDark, 3)}/>
  <path d="M184,300 V392 M216,300 V392" fill="none" ${stroke(C.furDark, 3)} opacity=".5"/>` : `
  <ellipse cx="128" cy="388" rx="46" ry="24" fill="${C.fur}" ${stroke(C.furDark, 3)}/>
  <ellipse cx="272" cy="388" rx="46" ry="24" fill="${C.fur}" ${stroke(C.furDark, 3)}/>`}`;

const paw = (x, y, r = 22, pads = true) => `
  <circle cx="${x}" cy="${y}" r="${r}" fill="${C.fur}" ${stroke(C.furDark, 3)}/>
  ${pads ? `<ellipse cx="${x}" cy="${y + 3}" rx="${r * 0.42}" ry="${r * 0.34}" fill="${C.pad}"/>
  <circle cx="${x - r * 0.46}" cy="${y - r * 0.28}" r="${r * 0.15}" fill="${C.pad}"/>
  <circle cx="${x}" cy="${y - r * 0.5}" r="${r * 0.15}" fill="${C.pad}"/>
  <circle cx="${x + r * 0.46}" cy="${y - r * 0.28}" r="${r * 0.15}" fill="${C.pad}"/>` : `<path d="M${x - r * 0.5},${y + r * 0.1} H${x + r * 0.5} M${x - r * 0.5},${y - r * 0.3} H${x + r * 0.5}" ${stroke(C.furDark, 3)} fill="none"/>`}`;

const svg = (corpo, nome, titulo) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 450" width="400" height="450" role="img" aria-label="${titulo}">
  <title>${titulo}</title>
${corpo}
</svg>
`;

// 1) Estudando: sentado, óculos redondos, livro aberto no chão
const estudando = `
  <g>
    <path d="M292,380 C352,372 366,316 340,282" fill="none" ${stroke(C.fur, 24)}/>
    <!-- livro -->
    <path d="M96,396 L200,410 L200,438 L96,424 Z" fill="${C.white}" ${stroke(C.line, 4)}/>
    <path d="M304,396 L200,410 L200,438 L304,424 Z" fill="${C.white}" ${stroke(C.line, 4)}/>
    <path d="M120,408 L186,418 M120,418 L186,428 M214,418 L280,408 M214,428 L280,418" ${stroke('#d9c8a8', 3)} fill="none"/>
    ${sittingBody(true).replace(/^\s*<path d="M292[^>]*>/, '')}
    ${[162, 238].map((x) => `<ellipse cx="${x}" cy="400" rx="25" ry="13" fill="${C.fur}" ${stroke(C.furDark, 3)}/>`).join('')}
    ${ears()}
    ${headBase()}
    ${eyesGlasses()}
    ${mouth.neutral}
    ${scarf()}
    ${hat()}
  </g>`;

// 2) Distraído: olha para cima, cabeça e chapéu inclinados, lápis apontando para baixo
const distraido = `
  <g>
    <path d="M292,380 C352,372 366,316 340,282" fill="none" ${stroke(C.fur, 24)}/>
    ${sittingBody(true).replace(/^\s*<path d="M292[^>]*>/, '')}
    ${[162, 238].map((x) => `<ellipse cx="${x}" cy="400" rx="25" ry="13" fill="${C.fur}" ${stroke(C.furDark, 3)}/>`).join('')}
    <!-- braço direito segurando o lápis, ponta para baixo -->
    <path d="M254,250 C304,256 326,288 320,322" fill="none" ${stroke(C.fur, 30)}/>
    <g>
      <rect x="311" y="250" width="18" height="16" rx="4" fill="#f28b8b"/>
      <rect x="311" y="264" width="18" height="12" fill="#c9c9c9"/>
      <rect x="311" y="274" width="18" height="84" fill="#e3a93f"/>
      <path d="M311,358 L329,358 L320,390 Z" fill="#f2d5a5"/>
      <path d="M316,378 L324,378 L320,390 Z" fill="${C.ink}"/>
      <path d="M316,278 V354" stroke="#fff" stroke-opacity=".3" stroke-width="3"/>
    </g>
    ${paw(320, 318, 21, false)}
    <g transform="rotate(-9 200 215)">
      ${ears()}
      ${headBase()}
      ${eyesOpen(7, -9)}
      ${mouth.small}
      ${scarf()}
      ${hat(-7, -8, -4)}
    </g>
  </g>`;

// 3) Sorrindo: braços para cima, olhos fechados
const sorrindo = `
  <g>
    <path d="M300,388 C356,380 372,330 346,296" fill="none" ${stroke(C.fur, 24)}/>
    <path d="M144,205 C124,262 96,322 104,388 Q110,408 140,408 H260 Q290,408 296,388 C304,322 276,262 256,205 Z" fill="${C.fur}"/>
    <ellipse cx="134" cy="392" rx="46" ry="22" fill="${C.fur}" ${stroke(C.furDark, 3)}/>
    <ellipse cx="266" cy="392" rx="46" ry="22" fill="${C.fur}" ${stroke(C.furDark, 3)}/>
    <path d="M150,240 C112,214 84,176 78,140" fill="none" ${stroke(C.fur, 32)}/>
    <path d="M250,240 C288,214 316,176 322,140" fill="none" ${stroke(C.fur, 32)}/>
    ${paw(78, 128, 22)}${paw(322, 128, 22)}
    ${ears()}
    ${headBase()}
    ${eyesHappy()}
    ${mouth.smile}
    ${scarf()}
    ${hat()}
  </g>`;

// 4) Determinado: caderno ao peito, punho para frente, olhar firme sem raiva
const determinado = `
  <g>
    <path d="M292,380 C352,372 366,316 340,282" fill="none" ${stroke(C.fur, 24)}/>
    ${sittingBody(true).replace(/^\s*<path d="M292[^>]*>/, '')}
    ${[162, 238].map((x) => `<ellipse cx="${x}" cy="400" rx="25" ry="13" fill="${C.fur}" ${stroke(C.furDark, 3)}/>`).join('')}
    <!-- caderno de espiral -->
    <g transform="rotate(8 250 300)">
      <rect x="214" y="258" width="76" height="98" rx="8" fill="${C.hat}" ${stroke(C.hatDark, 3)}/>
      <rect x="226" y="272" width="52" height="8" rx="3" fill="${C.hatLight}" opacity=".7"/>
      ${[270, 290, 310, 330].map((y) => `<circle cx="214" cy="${y}" r="5" fill="${C.white}" ${stroke(C.line, 2.5)}/>`).join('')}
    </g>
    ${paw(236, 330, 18, false)}
    <path d="M150,246 C112,238 92,214 88,190" fill="none" ${stroke(C.fur, 30)}/>
    ${paw(86, 178, 20)}
    ${ears()}
    ${headBase()}
    ${eyesOpen(5, 0)}
    ${brows(3)}
    ${mouth.soft}
    ${scarf()}
    ${hat()}
  </g>`;

const pasta = process.argv[2];
mkdirSync(pasta, { recursive: true });
const poses = {
  estudando: [estudando, 'Mascote do Arretado estudando, com óculos redondos e um livro aberto'],
  distraido: [distraido, 'Mascote do Arretado distraído, olhando para cima, com um lápis apontado para baixo'],
  sorrindo: [sorrindo, 'Mascote do Arretado sorrindo, com os braços para cima'],
  determinado: [determinado, 'Mascote do Arretado determinado, com um caderno e o punho levantado'],
};
for (const [nome, [corpo, titulo]] of Object.entries(poses)) writeFileSync(`${pasta}/${nome}.svg`, svg(corpo, nome, titulo));
console.log('ok', Object.keys(poses).join(', '));
