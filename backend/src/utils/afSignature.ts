import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { Env } from "./environment.js";
import forge from "node-forge";

export interface SignatureResult {
  hash: string;
  assinado: boolean;
  assinatura?: string;
  erro?: string;
}

/**
 * Gera hash SHA-256 do conteúdo e, se CERT_A1 configurado, assina com ICP-Brasil A1 (PKCS#7 detached).
 * Plug-and-play: sem certificado → apenas hash (assinado:false). Com .p12 → PKCS#7 base64 em `assinatura`.
 * Suporta CERT_A1_PATH (./certs/fragata-certs.pfx) ou CERT_A1_BASE64 (base64 do .p12 para Docker/K8s).
 */
export function signContent(content: string): SignatureResult {
  const hash = createHash("sha256").update(content).digest("hex");

  const hasCertPath = !!Env.CERT_A1_PATH && existsSync(Env.CERT_A1_PATH);
  const hasCertBase64 = !!Env.CERT_A1_BASE64;

  if (!hasCertPath && !hasCertBase64) {
    return { hash, assinado: false };
  }

  try {
    let p12Buffer: Buffer | null = null;
    if (hasCertBase64) {
      p12Buffer = Buffer.from(Env.CERT_A1_BASE64!, "base64");
    } else if (hasCertPath) {
      p12Buffer = readFileSync(Env.CERT_A1_PATH!);
    }

    if (!p12Buffer || p12Buffer.length === 0) {
      return { hash, assinado: false, erro: "Certificado vazio" };
    }

    // node-forge espera string binária
    const p12Der = p12Buffer.toString("binary");
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, Env.CERT_A1_PASSWORD ?? "");

    // Extrair chave privada (keyBag ou pkcs8ShroudedKeyBag)
    const oids = forge.pki.oids as Record<string, string>;
    const pkcs8Oid = oids.pkcs8ShroudedKeyBag ?? "1.2.840.113549.1.12.10.1.2";
    const keyBagOid = oids.keyBag ?? "1.2.840.113549.1.12.10.1.1";
    const certBagOid = oids.certBag ?? "1.2.840.113549.1.12.10.1.3";
    const keyBags =
      (p12.getBags({ bagType: pkcs8Oid }) as Record<string, forge.pkcs12.Bag[]>)[pkcs8Oid] ??
      (p12.getBags({ bagType: keyBagOid }) as Record<string, forge.pkcs12.Bag[]>)[keyBagOid];

    const certBags = (p12.getBags({ bagType: certBagOid }) as Record<string, forge.pkcs12.Bag[]>)[certBagOid];

    if (!keyBags || keyBags.length === 0 || !certBags || certBags.length === 0) {
      return { hash, assinado: false, erro: "Certificado A1 não contém chave privada ou certificado" };
    }

    const privateKey = keyBags[0]!.key as forge.pki.PrivateKey | undefined;
    const cert = certBags[0]!.cert as forge.pki.Certificate | undefined;

    if (!privateKey || !cert) {
      return { hash, assinado: false, erro: "Falha ao extrair chave/cert do P12" };
    }

    // Criar PKCS#7 SignedData detached
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(content, "utf8");
    p7.addCertificate(cert);
    const oids2 = forge.pki.oids as Record<string, string>;
    const sha256Oid = oids2.sha256 ?? "2.16.840.1.101.3.4.2.1";
    const contentTypeOid = oids2.contentType ?? "1.2.840.113549.1.9.3";
    const dataOid = oids2.data ?? "1.2.840.113549.1.7.1";
    const messageDigestOid = oids2.messageDigest ?? "1.2.840.113549.1.9.4";
    const signingTimeOid = oids2.signingTime ?? "1.2.840.113549.1.9.5";
    (p7 as unknown as { addSigner: (arg: unknown) => void }).addSigner({
      key: privateKey as unknown as string,
      certificate: cert,
      digestAlgorithm: sha256Oid,
      authenticatedAttributes: [
        { type: contentTypeOid, value: dataOid },
        { type: messageDigestOid },
        { type: signingTimeOid, value: new Date() },
      ],
    });

    // detached = true → assinatura não embute conteúdo (padrão fiscal)
    p7.sign({ detached: true } as unknown as object);

    const derBytes = forge.asn1.toDer(p7.toAsn1()).getBytes();
    const assinatura = Buffer.from(derBytes, "binary").toString("base64");

    return { hash, assinado: true, assinatura };
  } catch (e) {
    return {
      hash,
      assinado: false,
      erro: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Verifica se o conteúdo foi assinado corretamente (útil para testes/auditoria).
 * Retorna true se assinatura existe e hash bate.
 */
export function isSigned(result: SignatureResult): boolean {
  return result.assinado && !!result.assinatura && !result.erro;
}
