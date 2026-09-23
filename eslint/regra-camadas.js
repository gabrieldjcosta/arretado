// Regra local: impõe as dependências entre camadas da Parte 1 §6 e das decisões T4/T9.
import path from 'node:path';

const RAIZ_SRC = path.resolve(import.meta.dirname, '..', 'src');

/** Camada de um arquivo dentro de src/, ou null se fora. */
export function camadaDe(arquivo) {
  const rel = path.relative(RAIZ_SRC, arquivo);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const [topo, sub] = rel.split(path.sep);
  if (topo === 'dominios') return { camada: 'dominios', modulo: sub };
  if (topo === 'core') return { camada: 'core', modulo: sub };
  return { camada: topo, modulo: null };
}

// Pacotes externos restritos a um módulo do core (T4, T9).
const PACOTES_RESTRITOS = {
  dexie: 'persistencia',
  'dexie-react-hooks': 'persistencia',
  dompurify: 'seguranca',
};

function permitido(origem, destino) {
  if (!origem || !destino) return true;
  switch (origem.camada) {
    case 'core':
      return destino.camada === 'core';
    case 'dominios':
      return (
        destino.camada === 'core' ||
        (destino.camada === 'dominios' && destino.modulo === origem.modulo)
      );
    case 'suporte':
      return destino.camada === 'core' || destino.camada === 'suporte';
    case 'integracoes':
      return (
        destino.camada === 'core' ||
        destino.camada === 'integracoes' ||
        destino.camada === 'dominios'
      );
    default:
      return true;
  }
}

function descricao(c) {
  return c.modulo ? `${c.camada}/${c.modulo}` : c.camada;
}

/** @type {import('eslint').Rule.RuleModule} */
const regra = {
  meta: {
    type: 'problem',
    messages: {
      camada: 'Camada {{origem}} não pode importar de {{destino}} (Parte 1 §6).',
      pacote:
        'O pacote "{{pacote}}" só pode ser importado em src/core/{{modulo}} (decisões técnicas).',
    },
    schema: [],
  },
  create(context) {
    const arquivo = context.filename;
    const origem = camadaDe(arquivo);
    if (!origem) return {};

    function verificar(no) {
      const fonte = no.source?.value;
      if (typeof fonte !== 'string') return;
      if (fonte.startsWith('.')) {
        const destino = camadaDe(path.resolve(path.dirname(arquivo), fonte));
        if (!permitido(origem, destino)) {
          context.report({
            node: no.source,
            messageId: 'camada',
            data: { origem: descricao(origem), destino: descricao(destino) },
          });
        }
        return;
      }
      const pacote = fonte.startsWith('@')
        ? fonte.split('/').slice(0, 2).join('/')
        : fonte.split('/')[0];
      const modulo = PACOTES_RESTRITOS[pacote];
      if (modulo && !(origem.camada === 'core' && origem.modulo === modulo)) {
        const eTeste = /\.test\.tsx?$/.test(arquivo);
        if (!eTeste)
          context.report({ node: no.source, messageId: 'pacote', data: { pacote, modulo } });
      }
    }

    return {
      ImportDeclaration: verificar,
      ExportNamedDeclaration: verificar,
      ExportAllDeclaration: verificar,
      ImportExpression(no) {
        if (no.source.type === 'Literal') verificar({ source: no.source });
      },
    };
  },
};

export default regra;
