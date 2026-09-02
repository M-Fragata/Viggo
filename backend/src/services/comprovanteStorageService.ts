import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const LIMITE_MAXIMO_BYTES = 4 * 1024 * 1024; // 4 MB

export const MIME_TYPES_PERMITIDOS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

export interface SalvarComprovanteParams {
  companyId: string;
  nomeOriginal: string;
  mimeType: string;
  conteudoBase64: string;
}

export interface SalvarComprovanteResult {
  caminhoRelativo: string;
  caminhoAbsoluto: string;
  nomeOriginal: string;
  tamanhoBytes: number;
  mimeType: string;
}

/**
 * Diretório raiz de armazenamento de comprovantes (fora de public/)
 */
function getStorageRootDir(): string {
  return path.resolve(process.cwd(), "uploads", "comprovantes");
}

/**
 * Salva um anexo de atestado/justificativa de forma nativa em disco com limite rígido de 4MB.
 */
export async function salvarComprovanteEmDisco(
  params: SalvarComprovanteParams
): Promise<SalvarComprovanteResult> {
  const { companyId, nomeOriginal, mimeType, conteudoBase64 } = params;

  // 1. Validar MimeType
  const extensao = MIME_TYPES_PERMITIDOS[mimeType.toLowerCase()];
  if (!extensao) {
    throw new Error(
      "Tipo de arquivo não permitido. Apenas fotos (JPEG, PNG, WEBP) ou documentos PDF são aceitos."
    );
  }

  // 2. Limpar prefixo Data URL se houver (ex: data:image/png;base64,...)
  const cleanBase64 = conteudoBase64.replace(/^data:([A-Za-z-+\/]+);base64,/, "");

  // 3. Validar Tamanho Máximo em Bytes (4 MB)
  const tamanhoBytes = Buffer.byteLength(cleanBase64, "base64");
  if (tamanhoBytes > LIMITE_MAXIMO_BYTES) {
    throw new Error(
      `O arquivo enviado possui ${(tamanhoBytes / (1024 * 1024)).toFixed(2)} MB e excede o limite máximo permitido de 4 MB.`
    );
  }

  if (tamanhoBytes === 0) {
    throw new Error("O arquivo enviado está vazio.");
  }

  // 4. Preparar diretório isolado por tenant (companyId)
  const rootDir = getStorageRootDir();
  const companyDir = path.join(rootDir, companyId);
  await fs.mkdir(companyDir, { recursive: true });

  // 5. Gerar nome de arquivo inviolável (UUID + extensão correta)
  const fileId = randomUUID();
  const fileName = `${fileId}${extensao}`;
  const caminhoAbsoluto = path.join(companyDir, fileName);
  const caminhoRelativo = path.join(companyId, fileName).replace(/\\/g, "/");

  // 6. Converter Base64 para Buffer e salvar em disco
  const buffer = Buffer.from(cleanBase64, "base64");
  await fs.writeFile(caminhoAbsoluto, buffer);

  return {
    caminhoRelativo,
    caminhoAbsoluto,
    nomeOriginal: nomeOriginal.slice(0, 150),
    tamanhoBytes,
    mimeType,
  };
}

/**
 * Obtém o caminho absoluto do arquivo validando Directory Traversal e Tenant.
 */
export async function resolverCaminhoComprovante(
  companyId: string,
  caminhoRelativo: string
): Promise<string> {
  const rootDir = getStorageRootDir();
  const companyDir = path.join(rootDir, companyId);
  const caminhoAbsoluto = path.resolve(rootDir, caminhoRelativo);

  // Segurança: Prevenção contra Directory Traversal
  if (!caminhoAbsoluto.startsWith(companyDir)) {
    throw new Error("Acesso negado: tentativa de acesso fora do diretório da empresa.");
  }

  try {
    await fs.access(caminhoAbsoluto);
  } catch {
    throw new Error("Arquivo não encontrado no armazenamento.");
  }

  return caminhoAbsoluto;
}
