import { Botao } from "@apresentacao/componentes/Botao";
import { useCore } from "@apresentacao/shell/contexto-core";
import {
  desfazer,
  importar,
  ModoDeImportacao,
  type Previa,
  preverImportacao,
} from "@core/backup/importar";
import { abrir, EXTENSAO, exportar } from "@core/backup/pacote";
import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";

const ROTULOS: Record<ModoDeImportacao, { titulo: string; quando: string }> = {
  simulacao: { titulo: "Só simular", quando: "Ver o que aconteceria, sem mudar nada" },
  adicionarNovos: { titulo: "Adicionar somente novos", quando: "Trazer dados de outro aparelho" },
  atualizarIdentificados: {
    titulo: "Atualizar os que já existem",
    quando: "Corrigir em massa, sem criar nada",
  },
  mesclar: { titulo: "Mesclar", quando: "Restaurar parte dos dados depois de já ter usado" },
  substituirModulo: { titulo: "Substituir um módulo", quando: "Reimportar normas do zero" },
  restaurarIntegral: { titulo: "Restaurar tudo", quando: "Recuperar o aparelho depois de perder" },
  espacoSeparado: {
    titulo: "Abrir em espaço separado",
    quando: "Avaliar um pacote antes de misturar",
  },
};

/**
 * Conta e Ajustes › Dados (§12): exportar com senha opcional, importar por modo explícito com
 * **prévia obrigatória**, e desfazer a última importação enquanto o ponto de restauração existir.
 */
export function Dados() {
  const core = useCore();
  const entrada = useRef<HTMLInputElement>(null);
  const [comSenha, definirComSenha] = useState(false);
  const [senha, definirSenha] = useState("");
  const [modo, definirModo] = useState<ModoDeImportacao>("mesclar");
  const [arquivo, definirArquivo] = useState<Uint8Array | null>(null);
  const [previa, definirPrevia] = useState<Previa | null>(null);
  const [mensagem, definirMensagem] = useState<string | null>(null);
  const [ocupado, definirOcupado] = useState(false);

  const ultimaImportacao = useLiveQuery(async () => {
    const registros = (await core.db.table("logsDeImportacao").toArray()) as Array<{
      id: string;
      criadoEm: string;
      modo: string;
      snapshotId: string;
    }>;
    return registros.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0];
  }, [core.db]);

  const exportarPacote = async () => {
    definirOcupado(true);
    definirMensagem(null);
    try {
      const conteudo = await exportar(core.db, core.identidade, {
        senha: comSenha ? senha : undefined,
      });
      baixar(conteudo, `arretado-${new Date().toISOString().slice(0, 10)}${EXTENSAO}`);
      definirMensagem("Pacote exportado. Guarde o arquivo em outro lugar.");
    } catch (problema) {
      definirMensagem(descrever(problema));
    } finally {
      definirOcupado(false);
    }
  };

  const escolherArquivo = async (arquivoEscolhido: File) => {
    definirMensagem(null);
    definirPrevia(null);
    const conteudo = new Uint8Array(await arquivoEscolhido.arrayBuffer());
    definirArquivo(conteudo);
    await calcularPrevia(conteudo, modo);
  };

  const calcularPrevia = async (conteudo: Uint8Array, modoEscolhido: ModoDeImportacao) => {
    definirOcupado(true);
    try {
      const pacote = await abrir(conteudo, comSenha ? senha : undefined);
      definirPrevia(await preverImportacao(core.db, core.identidade, pacote, modoEscolhido));
    } catch (problema) {
      definirPrevia(null);
      definirMensagem(descrever(problema));
    } finally {
      definirOcupado(false);
    }
  };

  const confirmar = async () => {
    if (!arquivo) return;
    definirOcupado(true);
    try {
      const resultado = await importar(core.db, core.identidade, core.relogio, arquivo, {
        modo,
        senha: comSenha ? senha : undefined,
      });
      definirMensagem(
        resultado.aplicado
          ? "Importação concluída. Você pode desfazer logo abaixo."
          : "Simulação concluída: nada foi alterado.",
      );
      definirPrevia(null);
      definirArquivo(null);
      if (entrada.current) entrada.current.value = "";
    } catch (problema) {
      definirMensagem(descrever(problema));
    } finally {
      definirOcupado(false);
    }
  };

  const desfazerUltima = async () => {
    if (!ultimaImportacao) return;
    definirOcupado(true);
    try {
      await desfazer(core.db, core.identidade, core.relogio, ultimaImportacao.snapshotId);
      definirMensagem("Importação desfeita: os dados voltaram ao estado anterior.");
    } catch (problema) {
      definirMensagem(descrever(problema));
    } finally {
      definirOcupado(false);
    }
  };

  return (
    <section aria-labelledby="titulo-dados" className="space-y-6">
      <h2 id="titulo-dados" className="font-medium">
        Dados
      </h2>

      <div className="space-y-3">
        <p className="text-sm text-texto-atenuado">
          Seus dados ficam neste aparelho. Exporte de vez em quando e guarde o arquivo em outro
          lugar.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={comSenha}
            onChange={(evento) => definirComSenha(evento.target.checked)}
          />
          Proteger com senha
        </label>
        {comSenha && (
          <label className="block text-sm">
            <span className="mb-1 block">
              Senha (o app não a guarda; sem ela não há recuperação)
            </span>
            <input
              type="password"
              value={senha}
              onChange={(evento) => definirSenha(evento.target.value)}
              className="alvo-toque w-full max-w-sm rounded-md border border-borda bg-fundo p-2"
            />
          </label>
        )}
        <Botao
          variante="principal"
          disabled={ocupado || (comSenha && senha.length === 0)}
          onClick={() => void exportarPacote()}
        >
          Exportar
        </Botao>
      </div>

      <div className="space-y-3 border-t border-borda pt-6">
        <h3 className="text-sm font-medium">Importar</h3>
        <label className="block text-sm">
          <span className="mb-1 block">Modo</span>
          <select
            value={modo}
            onChange={(evento) => {
              const escolhido = ModoDeImportacao.parse(evento.target.value);
              definirModo(escolhido);
              if (arquivo) void calcularPrevia(arquivo, escolhido);
            }}
            className="alvo-toque w-full max-w-sm rounded-md border border-borda bg-fundo p-2"
          >
            {ModoDeImportacao.options.map((opcao) => (
              <option key={opcao} value={opcao}>
                {ROTULOS[opcao].titulo} — {ROTULOS[opcao].quando}
              </option>
            ))}
          </select>
        </label>

        <input
          ref={entrada}
          type="file"
          accept={EXTENSAO}
          aria-label="Escolher pacote"
          onChange={(evento) => {
            const escolhido = evento.target.files?.[0];
            if (escolhido) void escolherArquivo(escolhido);
          }}
          className="block text-sm"
        />

        {previa && <PreviaDaImportacao previa={previa} />}

        {previa && (
          <Botao variante="principal" disabled={ocupado} onClick={() => void confirmar()}>
            {previa.modo === "simulacao" ? "Ver resultado da simulação" : "Confirmar importação"}
          </Botao>
        )}
      </div>

      {ultimaImportacao && (
        <div className="space-y-2 border-t border-borda pt-6">
          <h3 className="text-sm font-medium">Última importação</h3>
          <p className="text-sm text-texto-atenuado">
            {ROTULOS[ModoDeImportacao.parse(ultimaImportacao.modo)].titulo} em{" "}
            {new Date(ultimaImportacao.criadoEm).toLocaleString("pt-BR")}
          </p>
          <Botao disabled={ocupado} onClick={() => void desfazerUltima()}>
            Desfazer
          </Botao>
        </div>
      )}

      {mensagem && (
        <p role="status" className="text-sm">
          {mensagem}
        </p>
      )}
    </section>
  );
}

/** Prévia obrigatória antes de confirmar (§12.3): criar, atualizar, ignorar, conflito, apagar. */
function PreviaDaImportacao({ previa }: { previa: Previa }) {
  const comMovimento = previa.contagens.filter(
    (c) => c.criar + c.atualizar + c.conflito + c.excluir > 0,
  );

  return (
    <div className="rounded-md border border-borda p-3 text-sm">
      <h4 className="font-medium">O que vai acontecer</h4>
      {comMovimento.length === 0 ? (
        <p className="mt-1 text-texto-atenuado">Nada muda: o pacote já está todo aqui.</p>
      ) : (
        <table className="mt-2 w-full text-left">
          <thead className="text-texto-atenuado">
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Criar</th>
              <th scope="col">Atualizar</th>
              <th scope="col">Ignorar</th>
              <th scope="col">Conflito</th>
              <th scope="col">Apagar</th>
            </tr>
          </thead>
          <tbody>
            {comMovimento.map((contagem) => (
              <tr key={contagem.entidade}>
                <td>{contagem.entidade}</td>
                <td>{contagem.criar}</td>
                <td>{contagem.atualizar}</td>
                <td>{contagem.ignorar}</td>
                <td>{contagem.conflito}</td>
                <td>{contagem.excluir}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {previa.totalDeExclusoes > 0 && (
        <p className="mt-2">
          <strong>{previa.totalDeExclusoes}</strong> registro(s) serão apagados.
        </p>
      )}
      {previa.avisos.map((aviso) => (
        <p key={aviso.mensagem} className="mt-2">
          {aviso.mensagem}
        </p>
      ))}
      {previa.criaraSnapshot && (
        <p className="mt-2 text-texto-atenuado">
          Um ponto de restauração será criado; você poderá desfazer em Conta e Ajustes › Dados.
        </p>
      )}
    </div>
  );
}

function baixar(conteudo: Uint8Array, nome: string): void {
  const url = URL.createObjectURL(new Blob([conteudo as BlobPart]));
  const ligacao = document.createElement("a");
  ligacao.href = url;
  ligacao.download = nome;
  ligacao.click();
  URL.revokeObjectURL(url);
}

const descrever = (problema: unknown): string =>
  problema instanceof Error ? problema.message : "Não foi possível concluir.";
