# Hero Section - Implementação e Documentação

## Visão Geral

Refatoração da hero section da landing page para layout de duas colunas (desktop) com componente de mídia responsivo usando `<picture>` + `<video>`.

---

## Estrutura de Arquivos

```
frontend/
├── public/
│   ├── celular na mao.webp      # Poster/imagem mobile + fallback
│   ├── celular.webp             # Poster vídeo desktop (frame final)
│   └── Gemini-Video.webm        # Vídeo autoplay desktop
├── src/
│   ├── components/
│   │   └── HeroMedia.tsx        # Componente de mídia responsivo
│   └── pages/
│       └── LandingPage.tsx      # Hero section com layout 2 colunas
```

---

## Implementação Atual: `<picture>` + `<video>` (Nativa)

### HeroMedia.tsx - Lógica Principal

```tsx
<picture>
  {/* Desktop (≥1024px): vídeo com poster do frame final */}
  <source srcSet="/celular.webp" type="image/webp" media="(min-width: 1024px)" />
  
  {/* Mobile (<1024px): imagem estática */}
  <source srcSet="/celular na mao.webp" type="image/webp" media="(max-width: 1023px)" />
  
  {/* Fallback universal */}
  <video
    autoPlay
    muted
    loop
    playsInline
    poster="/celular na mao.webp"
    className="w-full h-auto object-cover rounded-2xl shadow-xl"
  >
    <source src="/Gemini-Video.webm" type="video/webm" />
    <img src="/celular na mao.webp" alt="..." className="w-full h-auto object-cover rounded-2xl shadow-xl" />
  </video>
</picture>
```

### Comportamento por Dispositivo

| Dispositivo | Breakpoint | Renderiza |
|-------------|------------|-----------|
| **Desktop** | `≥1024px` (lg) | `<video>` autoplay muted loop com `poster="/celular.webp"` |
| **Mobile** | `<1024px` | `<img>` estática `/celular na mao.webp` via `<picture>` |
| **Fallback** | Qualquer | `<img>` dentro do `<video>` se vídeo não suportado |

### Recursos de Acessibilidade e Performance

- ✅ `prefers-reduced-motion`: Detecta e desabilita vídeo automaticamente
- ✅ `loading="eager"` + `fetchPriority="high"`: Carregamento prioritário
- ✅ `playsInline`: Necessário para autoplay no iOS Safari
- ✅ `muted`: Obrigatório para autoplay em todos os browsers
- ✅ Fallback `<img>` dentro do `<video>` para browsers sem suporte a WebM
- ✅ Transição de opacidade (500ms) ao carregar vídeo
- ✅ Error boundary: Se vídeo falhar, mostra imagem estática

---

## LandingPage.tsx - Layout Duas Colunas

```tsx
<section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
  <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
    {/* Coluna Esquerda - Conteúdo (flex-1, max-w-2xl) */}
    <div className="text-center lg:text-left flex-1 max-w-2xl">
      <h1>Controle de ponto com <TypewriterText ... /></h1>
      <p>Elimine fraudes, ganhe agilidade...</p>
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
        <Link to="/company/signup">Começar trial...</Link>
        <Link to="/login">Já tenho conta</Link>
      </div>
    </div>

    {/* Coluna Direita - Mídia (hidden mobile, flex desktop) */}
    <div className="hidden lg:flex lg:flex-1 justify-center">
      <HeroMedia />
    </div>
  </div>

  {/* Mobile: mídia empilhada abaixo do texto */}
  <div className="lg:hidden mt-12">
    <HeroMedia />
  </div>
</section>
```

### Classes Tailwind Principais

| Elemento | Classes |
|----------|---------|
| Container | `flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16` |
| Coluna Texto | `flex-1 max-w-2xl text-center lg:text-left` |
| Coluna Mídia | `hidden lg:flex lg:flex-1 justify-center` |
| Mobile Mídia | `lg:hidden mt-12` |
| Botões | `flex-col sm:flex-row items-center justify-center lg:justify-start gap-4` |

---

## Abordagem Futura: GSAP ScrollTrigger (Documentação)

### Por Que Não Foi Implementado Agora

| Fator | Autoplay Nativo | GSAP ScrollTrigger |
|-------|-----------------|-------------------|
| Dependências | 0 | GSAP + ScrollTrigger (~50KB gzipped) |
| Complexidade | Baixa | Média-Alta |
| Acessibilidade | Nativa (`prefers-reduced-motion`) | Manual |
| Mobile | Funciona nativamente | Requer touch/scroll handling |
| Performance | Browser otimizado | JS no main thread |
| Manutenção | Zero | Atual | Atualizações de lib |

### Implementação Sugerida com GSAP (Para Futuro)

```tsx
// HeroMediaGSAP.tsx - Exemplo conceitual
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function HeroMediaGSAP() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    ScrollTrigger.create({
      trigger: container,
      start: "top 80%",
      end: "bottom 20%",
      onEnter: () => video.play(),
      onLeaveBack: () => video.pause(),
      onLeave: () => video.pause(),
    });

    // Scrub frame-by-frame (opcional)
    // ScrollTrigger.create({
    //   trigger: container,
    //   scrub: 1,
    //   onUpdate: (self) => {
    //     video.currentTime = video.duration * self.progress;
    //   },
    // });
  }, []);

  return (
    <div ref={containerRef} className="relative w-full aspect-[16/9]">
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        poster="/celular.webp"
        className="absolute inset-0 w-full h-full object-cover rounded-2xl shadow-xl"
      >
        <source src="/Gemini-Video.webm" type="video/webm" />
      </video>
    </div>
  );
}
```

### Migração Futura (Quando Decidir)

1. **Instalar dependências:**
   ```bash
   cd frontend && npm install gsap @gsap/react
   ```

2. **Criar `HeroMediaGSAP.tsx`** (baseado no exemplo acima)

3. **Trocar import em `LandingPage.tsx`:**
   ```tsx
   // import { HeroMedia } from "../components/HeroMedia";
   import { HeroMediaGSAP } from "../components/HeroMediaGSAP";
   ```

4. **Ajustar container** para ter altura fixa (`aspect-[16/9]`) para ScrollTrigger funcionar

5. **Testar:** Desktop scroll sync, mobile touch, acessibilidade, performance

---

## Checklist de Verificação

- [x] Arquivos em `frontend/public/`: `celular na mao.webp`, `celular.webp`, `Gemini-Video.webm`
- [x] `HeroMedia.tsx` criado com `<picture>` + `<video>` responsivo
- [x] `LandingPage.tsx` refatorado para layout 2 colunas flexbox
- [x] Breakpoint `lg` (1024px) usado consistentemente
- [x] `autoPlay`, `muted`, `loop`, `playsInline` no vídeo
- [x] `poster="/celular na mao.webp"` no vídeo, `celular.webp` como source desktop
- [x] `prefers-reduced-motion` respeitado
- [x] Fallback `<img>` para vídeo não suportado
- [x] Mobile: imagem estática empilhada abaixo do texto
- [x] Desktop: duas colunas lado a lado com gap responsivo
- [x] Botões empilham em mobile (`flex-col sm:flex-row`)

---

## Comandos de Verificação

```bash
cd frontend
npm run build   # TypeScript + Vite build
npm run lint    # ESLint
npm run dev     # Visual test
```

---

## Notas de Manutenção

- **Vídeo WebM**: Formato moderno, amplo suporte. Se precisar de fallback MP4, adicione `<source src="/video.mp4" type="video/mp4" />` antes do WebM.
- **Poster**: `celular.webp` deve ser o frame final exato do vídeo para transição imperceptível.
- **Performance**: Vídeo carrega com `fetchPriority="high"` no poster. Considere `preload="metadata"` se vídeo for pesado.
- **GSAP**: Mantenha esta documentação. Migração é simples: substituir componente, sem breaking changes no layout.