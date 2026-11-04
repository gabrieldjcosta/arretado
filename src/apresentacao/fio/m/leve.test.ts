import { aparelhoLeve } from './leve';

const original = {
  nucleos: Object.getOwnPropertyDescriptor(Navigator.prototype, 'hardwareConcurrency'),
};

function aparelho(dados: { memoria?: number; nucleos?: number; economia?: boolean }) {
  Object.defineProperty(navigator, 'deviceMemory', {
    configurable: true,
    value: dados.memoria,
  });
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    configurable: true,
    value: dados.nucleos ?? 8,
  });
  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    value: dados.economia === undefined ? undefined : { saveData: dados.economia },
  });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'deviceMemory');
  Reflect.deleteProperty(navigator, 'connection');
  Reflect.deleteProperty(navigator, 'hardwareConcurrency');
  if (original.nucleos)
    Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', original.nucleos);
});

describe('o modo leve do mockup', () => {
  it('um aparelho folgado não é leve', () => {
    aparelho({ memoria: 8, nucleos: 8, economia: false });
    expect(aparelhoLeve()).toBe(false);
  });

  it('pouca memória, poucos núcleos ou a economia de dados ligam o modo leve', () => {
    aparelho({ memoria: 2 });
    expect(aparelhoLeve()).toBe(true);
    aparelho({ nucleos: 2 });
    expect(aparelhoLeve()).toBe(true);
    aparelho({ economia: true });
    expect(aparelhoLeve()).toBe(true);
  });

  it('sem o dado (o navegador não diz a memória nem a conexão), não é leve', () => {
    aparelho({});
    expect(aparelhoLeve()).toBe(false);
  });
});
