import { extendedPrisma } from "../database/prisma-extensions.js";

const RAIO_TERRA_METROS = 6371000; // Raio médio da Terra em metros (WGS-84)

/**
 * Converte graus decimais para radianos.
 */
function toRad(graus: number): number {
  return (graus * Math.PI) / 180;
}

/**
 * Calcula a distância ortodrômica em metros entre dois pontos geográficos
 * utilizando a fórmula de Haversine (100% nativa em TypeScript).
 */
export function calcularDistanciaHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(RAIO_TERRA_METROS * c);
}

export interface PoloTrabalhoInfo {
  id: string;
  nome: string;
  endereco: string | null;
  latitude: number;
  longitude: number;
  raioMetros: number;
}

export interface ResultadoAuditoriaGeofence {
  possuiPolosCadastrados: boolean;
  poloMaisProximo: PoloTrabalhoInfo | null;
  distanciaMetros: number | null;
  dentroDoRaio: boolean;
  mensagemAuditoria: string;
}

/**
 * Avalia a localização de uma marcação de ponto contra todos os polos ativos da empresa.
 * Retorna a menor distância calculada e os dados do polo mais próximo.
 * Segue estritamente a Portaria MTE 671/2021: audita sem bloquear o registro.
 */
export async function avaliarLocalizacaoCheckin(
  companyId: string,
  latitude?: number | null,
  longitude?: number | null
): Promise<ResultadoAuditoriaGeofence> {
  // Se coordenadas não foram fornecidas (ex: geolocalização desativada pelo usuário)
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return {
      possuiPolosCadastrados: false,
      poloMaisProximo: null,
      distanciaMetros: null,
      dentroDoRaio: false,
      mensagemAuditoria: "Geolocalização não fornecida pelo dispositivo.",
    };
  }

  // 1. Buscar todos os polos ativos da empresa (multi-tenancy estrito)
  const polos = await extendedPrisma.workLocation.findMany({
    where: {
      companyId,
      ativo: true,
    },
    select: {
      id: true,
      nome: true,
      endereco: true,
      latitude: true,
      longitude: true,
      raioMetros: true,
    },
  });

  // Se a empresa ainda não cadastrou polos de trabalho
  if (polos.length === 0) {
    return {
      possuiPolosCadastrados: false,
      poloMaisProximo: null,
      distanciaMetros: null,
      dentroDoRaio: true,
      mensagemAuditoria: "Empresa não possui polos geográficos cadastrados.",
    };
  }

  // 2. Calcular a menor distância entre o colaborador e cada um dos polos
  let poloMaisProximo: PoloTrabalhoInfo | null = null;
  let menorDistanciaMetros = Infinity;

  for (const polo of polos) {
    const distancia = calcularDistanciaHaversine(
      latitude,
      longitude,
      polo.latitude,
      polo.longitude
    );

    if (distancia < menorDistanciaMetros) {
      menorDistanciaMetros = distancia;
      poloMaisProximo = polo;
    }
  }

  if (!poloMaisProximo) {
    return {
      possuiPolosCadastrados: true,
      poloMaisProximo: null,
      distanciaMetros: null,
      dentroDoRaio: true,
      mensagemAuditoria: "Não foi possível calcular o polo mais próximo.",
    };
  }

  // 3. Verificar se o colaborador estava dentro do raio estipulado pelo polo
  const dentroDoRaio = menorDistanciaMetros <= poloMaisProximo.raioMetros;
  const mensagemAuditoria = dentroDoRaio
    ? `Registrado dentro do perímetro do polo '${poloMaisProximo.nome}' (a ${menorDistanciaMetros}m do centro).`
    : `Ponto registrado fora do polo: a ${menorDistanciaMetros}m de '${poloMaisProximo.nome}' (raio permitido: ${poloMaisProximo.raioMetros}m).`;

  return {
    possuiPolosCadastrados: true,
    poloMaisProximo,
    distanciaMetros: menorDistanciaMetros,
    dentroDoRaio,
    mensagemAuditoria,
  };
}
