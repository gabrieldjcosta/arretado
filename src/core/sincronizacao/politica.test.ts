import { camposComuns } from '../modelo/comum';
import { Preferencias } from '../modelo/sistema';
import { CAMPOS_DO_APARELHO } from './politica';

/**
 * Campos de Preferências que viajam entre os aparelhos (Q3: metas e perfil de estudo sincronizam).
 * Campo novo em Preferências tem de entrar aqui ou em CAMPOS_DO_APARELHO: sem a decisão, o teste
 * reprova, em vez de o campo sair sincronizando por omissão.
 */
const VIAJAM = [
  // Apresentação do leitor e do foco: a confirmar com o Gabriel se são "aparência" (Q3).
  'mostrarRedacoesAnteriores',
  'destacarCondicionantesEPrazos',
  'lenteDoFoco',
  'espiadaDosVizinhos',
  // Metas, perfil e rotina de estudo.
  'cotaDiaria',
  'perfilDeEstudo',
  'perfilAnterior',
  'modoSoEstudo',
  'temporizadorPadraoMin',
  'horaFechamento',
  'lembrete',
  'modulosDesabilitados',
  'retencaoSnapshots',
];

describe('política de Preferências (Q3)', () => {
  it('todo campo de Preferências está decidido: do aparelho ou sincronizado', () => {
    const decididos = [
      ...Object.keys(camposComuns),
      ...(CAMPOS_DO_APARELHO.preferencias ?? []),
      ...VIAJAM,
    ];
    const todos = Object.keys(Preferencias.shape);
    expect(todos.filter((k) => !decididos.includes(k))).toEqual([]);
    expect(decididos.filter((k) => !todos.includes(k))).toEqual([]);
  });
});
