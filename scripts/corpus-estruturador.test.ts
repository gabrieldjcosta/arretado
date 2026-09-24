/// <reference lib="dom" />
// O sanitizador (src/) usa os tipos do DOM (DOMPurify); o tsconfig.node não os traz.
// A página oficial inteira (não o colado) pelo sanitizador e pelo estruturador (F2, 8.2). No CP e
// na CF o `</body></html>` vem logo no começo do arquivo, com a lei inteira depois (fatos da 7.1):
// o parser HTML5 devolve esse conteúdo ao corpo, e nada pode cortar a entrada em `</html>`. Serve
// também à importação por URL (12.3), que recebe os bytes da página, não o colado.
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { TextDecoder } from 'node:util';
import { sanitizarHtml } from '../src/core/seguranca/sanitizador';
import { estruturar } from '../src/dominios/legislacao/estruturador';
import {
  artigosDe,
  artigosEsperados,
  dispositivosDe,
  dispositivosEsperados,
  estruturaDe,
  estruturaEsperada,
  semRevogadosAusentes,
  type Gabarito,
} from '../src/testes/gabarito';

const DIRETORIO = path.join(import.meta.dirname, '..', 'corpus', 'normas');

describe('página oficial inteira → sanitizador → estruturador (8.2–8.4)', () => {
  it.each([
    ['cp', 4_613],
    ['cf', 133_966],
  ])(
    '%s: a lei depois do </html> chega inteira ao estruturador',
    async (id, posicaoDoFim) => {
      const bytes = await readFile(path.join(DIRETORIO, `${id}.html`));
      expect(bytes.indexOf('</html>')).toBe(posicaoDoFim);
      expect(bytes.length - posicaoDoFim).toBeGreaterThan(500_000);
      // O Planalto grava em windows-1252 e não declara charset (manifesto.json).
      const html = new TextDecoder('windows-1252').decode(bytes);

      const rascunho = estruturar(sanitizarHtml(html).blocos);
      const gabarito = JSON.parse(
        await readFile(path.join(DIRETORIO, `${id}.gabarito.json`), 'utf8'),
      ) as Gabarito;
      expect(estruturaDe(rascunho.nos)).toEqual(estruturaEsperada(gabarito));
      // Os artigos e as rubricas também (8.3; o revogado todo tachado fica de fora até a 8.6).
      const artigos = artigosDe(rascunho.nos);
      const esperados = semRevogadosAusentes(
        artigosEsperados(gabarito),
        artigos.map((a) => a.endereco),
      );
      expect(artigos.map((a) => [a.endereco, a.nome !== undefined])).toEqual(
        esperados.map((e) => [e.endereco, e.nome]),
      );
      // E os dispositivos da regra 6, com o endereço canônico (8.4; na CF, o ADCT com `adct.`).
      const dispositivos = dispositivosDe(rascunho.nos).map((d) => d.endereco);
      expect(dispositivos).toEqual(
        semRevogadosAusentes(dispositivosEsperados(gabarito), dispositivos).map((e) => e.endereco),
      );
      expect(rascunho.metadados.preambulo).toMatch(/^(?:O PRESIDENTE|Nós, representantes)/);
    },
    60_000,
  );
});
