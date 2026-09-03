import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App.tsx'

// Captura falhas de download de chunks do Vite (ex: novos deploys no servidor ou oscilação 4G)
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const chaveRecarregamento = '@fragata:last-chunk-reload';
  const ultimoRecarregamento = Number(sessionStorage.getItem(chaveRecarregamento) || '0');
  const agora = Date.now();

  // Limite de retentativa para evitar loop caso a conexão caia completamente: 10 segundos
  if (agora - ultimoRecarregamento > 10000) {
    sessionStorage.setItem(chaveRecarregamento, String(agora));
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
