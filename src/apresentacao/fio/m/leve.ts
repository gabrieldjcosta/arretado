// O modo leve do mockup aprovado: em aparelho de pouca memória, de pouco processamento ou com a economia de dados
// ligada, as camadas de brilho (o desfoque de SVG, que pesa na GPU) somem. No mockup é a classe `leve` no <html>
// (`.leve .brilho { display: none }`); no app é `m-leve` na raiz do Fio (`CascaM`), que o CSS gerado já espera.

interface NavegadorComDados extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/** A mesma conta do mockup: 2 GB ou menos, 2 núcleos ou menos, ou a economia de dados do aparelho ligada. */
export function aparelhoLeve(): boolean {
  const n: NavegadorComDados = navigator;
  const pouca = n.deviceMemory !== undefined && n.deviceMemory > 0 && n.deviceMemory <= 2;
  const poucos = n.hardwareConcurrency > 0 && n.hardwareConcurrency <= 2;
  return pouca || poucos || n.connection?.saveData === true;
}
