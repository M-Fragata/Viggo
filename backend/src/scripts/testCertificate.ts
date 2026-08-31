import { readFileSync, existsSync } from "node:fs";
import forge from "node-forge";
import { Env } from "../utils/environment.js";
import { signContent } from "../utils/afSignature.js";

async function runCertificateDiagnostic() {
  console.log("==================================================");
  console.log("  🔍 DIAGNÓSTICO DO CERTIFICADO DIGITAL ICP-BRASIL A1 ");
  console.log("==================================================\n");

  const hasPath = !!Env.CERT_A1_PATH;
  const hasBase64 = !!Env.CERT_A1_BASE64;
  const hasPassword = !!Env.CERT_A1_PASSWORD;

  console.log("1. Configuração no .env:");
  console.log(`   - CERT_A1_PATH:   ${hasPath ? Env.CERT_A1_PATH : "(não informado)"}`);
  console.log(`   - CERT_A1_BASE64: ${hasBase64 ? `(presente, tamanho: ${Env.CERT_A1_BASE64!.length} caracteres)` : "(não informado)"}`);
  console.log(`   - CERT_A1_PASSWORD: ${hasPassword ? "****** (configurada)" : "(não configurada)"}\n`);

  if (!hasPath && !hasBase64) {
    console.error("❌ ERRO: Nenhuma variável de certificado encontrada (CERT_A1_PATH ou CERT_A1_BASE64).");
    console.log("👉 Adicione CERT_A1_PATH (ex: ./certs/viggo-a1.p12) ou CERT_A1_BASE64 no backend/.env");
    return;
  }

  let p12Buffer: Buffer | null = null;

  if (hasBase64) {
    try {
      p12Buffer = Buffer.from(Env.CERT_A1_BASE64!, "base64");
      console.log("✅ Buffer carregado a partir de CERT_A1_BASE64 com sucesso.");
    } catch (e) {
      console.error("❌ ERRO ao decodificar CERT_A1_BASE64:", e);
      return;
    }
  } else if (hasPath) {
    if (!existsSync(Env.CERT_A1_PATH!)) {
      console.error(`❌ ERRO: O arquivo apontado por CERT_A1_PATH não existe: "${Env.CERT_A1_PATH}"`);
      return;
    }
    try {
      p12Buffer = readFileSync(Env.CERT_A1_PATH!);
      console.log(`✅ Arquivo carregado a partir de CERT_A1_PATH: ${Env.CERT_A1_PATH} (${p12Buffer.length} bytes)`);
    } catch (e) {
      console.error("❌ ERRO ao ler arquivo do certificado:", e);
      return;
    }
  }

  if (!p12Buffer || p12Buffer.length === 0) {
    console.error("❌ ERRO: Buffer do certificado está vazio.");
    return;
  }

  console.log("\n2. Decodificação PKCS#12 (.p12 / .pfx):");
  try {
    const p12Der = p12Buffer.toString("binary");
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, Env.CERT_A1_PASSWORD ?? "");

    console.log("   ✅ Senha validada e arquivo PKCS#12 aberto com sucesso!");

    // Extração de Bags
    const oids = forge.pki.oids as Record<string, string>;
    const pkcs8Oid = oids.pkcs8ShroudedKeyBag ?? "1.2.840.113549.1.12.10.1.2";
    const keyBagOid = oids.keyBag ?? "1.2.840.113549.1.12.10.1.1";
    const certBagOid = oids.certBag ?? "1.2.840.113549.1.12.10.1.3";

    const keyBags =
      (p12.getBags({ bagType: pkcs8Oid }) as Record<string, forge.pkcs12.Bag[]>)[pkcs8Oid] ??
      (p12.getBags({ bagType: keyBagOid }) as Record<string, forge.pkcs12.Bag[]>)[keyBagOid];

    const certBags = (p12.getBags({ bagType: certBagOid }) as Record<string, forge.pkcs12.Bag[]>)[certBagOid];

    if (!keyBags || keyBags.length === 0) {
      console.error("   ❌ ERRO: Chave privada não encontrada no arquivo .p12.");
      return;
    }
    console.log("   ✅ Chave privada encontrada e extraída.");

    if (!certBags || certBags.length === 0) {
      console.error("   ❌ ERRO: Certificado X.509 não encontrado no arquivo .p12.");
      return;
    }
    const cert = certBags[0]!.cert as forge.pki.Certificate;
    console.log("   ✅ Certificado público X.509 encontrado.");

    console.log("\n3. Metadados do Certificado:");
    const subjectAttrs = cert.subject.attributes.map((a) => `${a.name || a.type}: ${a.value}`).join(" | ");
    const issuerAttrs = cert.issuer.attributes.map((a) => `${a.name || a.type}: ${a.value}`).join(" | ");

    console.log(`   - Titular (Subject): ${subjectAttrs}`);
    console.log(`   - Emissor (Issuer):  ${issuerAttrs}`);
    console.log(`   - Válido de:         ${cert.validity.notBefore.toLocaleString("pt-BR")}`);
    console.log(`   - Válido até:        ${cert.validity.notAfter.toLocaleString("pt-BR")}`);

    const now = new Date();
    if (now < cert.validity.notBefore) {
      console.warn("   ⚠️ AVISO: Certificado ainda não é válido (data de início futura).");
    } else if (now > cert.validity.notAfter) {
      console.error("   ❌ ERRO: Certificado EXPIRADO!");
    } else {
      const diasRestantes = Math.ceil((cert.validity.notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`   ✅ STATUS: Certificado VÁLIDO (${diasRestantes} dias restantes).`);
    }

    console.log("\n4. Teste de Assinatura Digital (PKCS#7 detached):");
    const testContent = "VIGGO_TEST_PAYLOAD_" + Date.now();
    const result = signContent(testContent);

    if (result.assinado && result.assinatura) {
      console.log("   ✅ ASSINATURA REALIZADA COM SUCESSO!");
      console.log(`   - Hash SHA-256: ${result.hash}`);
      console.log(`   - Assinatura PKCS#7 (Base64 - Primeiros 50 chars): ${result.assinatura.substring(0, 50)}...`);
      console.log(`   - Tamanho da assinatura: ${result.assinatura.length} caracteres`);
      console.log("\n🎉 PARABÉNS: O certificado digital A1 está 100% pronto e operacional para emissão fiscal (Portaria 671 MTE / REP-P).");
    } else {
      console.error("   ❌ Falha na assinatura digital:", result.erro);
    }
  } catch (err) {
    console.error("❌ ERRO ao processar o certificado:", err instanceof Error ? err.message : err);
    console.log("\n💡 Dica: Verifique se a senha informada em CERT_A1_PASSWORD confere exatamente com a senha do arquivo .p12/.pfx.");
  }
  console.log("\n==================================================");
}

runCertificateDiagnostic();
