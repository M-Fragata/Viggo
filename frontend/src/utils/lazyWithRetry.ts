import { lazy, type ComponentType } from "react";

interface ModuloComponente<T> {
  default: T;
}

/**
 * Utilitário para envolver `React.lazy()` com retentativas automáticas em caso de falha de conexão.
 * Ideal para redes móveis (4G/5G) e deploys de novas versões com novos hashes de chunks.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<ModuloComponente<T>>,
  maxRetentativas = 2,
  intervaloMs = 1000
) {
  return lazy(async () => {
    let retentativa = 0;

    while (retentativa < maxRetentativas) {
      try {
        return await importFn();
      } catch (erro: unknown) {
        retentativa++;
        if (retentativa >= maxRetentativas) {
          // Registra para depuração e propaga para o ErrorBoundary capturar
          console.error(`[Viggo] Falha ao carregar módulo após ${maxRetentativas} tentativas:`, erro);
          throw erro;
        }
        // Aguarda antes da próxima tentativa para a rede se restabelecer
        await new Promise((resolve) => setTimeout(resolve, intervaloMs));
      }
    }

    return importFn();
  });
}
