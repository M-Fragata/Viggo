/**
 * Utilitário para busca resiliente de CNPJ com múltiplos provedores
 * Suporta CNPJs recém-criados através de fallbacks (BrasilAPI -> MinhaReceita -> CNPJ.ws)
 */

export interface CnpjLookupResult {
  razaoSocial: string;
  nomeFantasia?: string;
  provider: string;
}

export async function lookupCnpj(rawCnpj: string): Promise<CnpjLookupResult | null> {
  const cnpj = rawCnpj.replace(/\D/g, "");
  if (cnpj.length !== 14) return null;

  // 1. Tentar Minha Receita (frequentemente mais atualizada para CNPJs recentes)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://minhareceita.org/${cnpj}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const name = data.razao_social || data.nome_fantasia;
      if (name) {
        return {
          razaoSocial: data.razao_social || name,
          nomeFantasia: data.nome_fantasia || undefined,
          provider: "MinhaReceita",
        };
      }
    }
  } catch {
    // Falha silenciosa para tentar próximo provedor
  }

  // 2. Tentar BrasilAPI
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const name = data.razao_social || data.nome_fantasia;
      if (name) {
        return {
          razaoSocial: data.razao_social || name,
          nomeFantasia: data.nome_fantasia || undefined,
          provider: "BrasilAPI",
        };
      }
    }
  } catch {
    // Falha silenciosa para tentar próximo provedor
  }

  // 3. Tentar CNPJ.ws pública
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const razaoSocial = data.razao_social;
      const nomeFantasia = data.estabelecimento?.nome_fantasia;
      if (razaoSocial || nomeFantasia) {
        return {
          razaoSocial: razaoSocial || nomeFantasia,
          nomeFantasia: nomeFantasia || undefined,
          provider: "CNPJ.ws",
        };
      }
    }
  } catch {
    // Falha silenciosa
  }

  return null;
}
