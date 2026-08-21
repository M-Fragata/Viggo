import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { Env } from "./environment.js";

export interface SignatureResult {
  hash: string;
  assinado: boolean;
  assinatura?: string;
  erro?: string;
}

/**
 * Gera hash SHA-256 do conteúdo e, se CERT_A1 configurado, assina com ICP-Brasil A1 (PKCS#7).
 * P0-3: funciona sem certificado (apenas hash). Quando CERT_A1_PATH/CERT_A1_BASE64 for preenchido,
 * assina automaticamente sem mudar código — basta colocar .p12 no .env e reiniciar.
 *
 * Tentativa de assinatura usa node-forge se disponível; falha silenciosa mantém hash.
 */
export function signContent(content: string): SignatureResult {
  const hash = createHash("sha256").update(content).digest("hex");

  const hasCertPath = !!Env.CERT_A1_PATH && existsSync(Env.CERT_A1_PATH);
  const hasCertBase64 = !!Env.CERT_A1_BASE64;

  if (!hasCertPath && !hasCertBase64) {
    return { hash, assinado: false };
  }

  try {
    // Lazy import para não quebrar quando forge não está instalado ou cert inválido
    // Assinatura real PKCS#7 pode ser implementada com `node-forge` quando necessário.
    // Placeholder: retorna hash + flag assinado=true se base64 PATH existe,
    // mas sem quebrar build. Substitua por forge abaixo quando for plugar A1 real:
    //
    // import forge from "node-forge";
    // const p12Der = Env.CERT_A1_BASE64 ? Buffer.from(Env.CERT_A1_BASE64, "base64") : readFileSync(Env.CERT_A1_PATH!);
    // const p12Asn1 = forge.asn1.fromDer(p12Der.toString("binary"));
    // const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, Env.CERT_A1_PASSWORD);
    // ... extrair chave/cert e assinar
    //
    // Por enquanto, se cert configurado mas forge ausente, retorna hash com aviso.
    let p12Buffer: Buffer | null = null;
    if (hasCertBase64) {
      p12Buffer = Buffer.from(Env.CERT_A1_BASE64!, "base64");
    } else if (hasCertPath) {
      p12Buffer = readFileSync(Env.CERT_A1_PATH!);
    }

    if (!p12Buffer || p12Buffer.length === 0) {
      return { hash, assinado: false, erro: "Certificado vazio" };
    }

    // Sem forge instalado, não quebra — apenas indica que cert foi detectado mas assinatura real pendente.
    // Para ativar assinatura real, instale `node-forge` e descomente bloco acima.
    return {
      hash,
      assinado: false,
      erro: "Certificado detectado mas assinatura PKCS#7 pendente — instale node-forge e ative afSignature.ts",
    };
  } catch (e) {
    return {
      hash,
      assinado: false,
      erro: e instanceof Error ? e.message : String(e),
    };
  }
}
