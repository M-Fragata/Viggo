# 📋 Relatório de Auditoria ESLint - Viggo Frontend

Este documento lista e classifica todos os **39 problemas** apontados pelo ESLint no frontend da aplicação, organizados por **nível de periculosidade**, detalhando a causa raiz, o impacto prático em produção e a recomendação exata de como corrigir cada um.

---

## 📊 Visão Geral por Gravidade

| Nível | Quantidade Inicial | Status | Impacto |
|---|:---:|:---:|---|
| 🔴 **Nível 1 - Crítico / Alto** | 6 | **RESOLVIDO ✅ (0 pendências)** | Desmontagem indevida de componentes, perda de estado em formulários, mutações ilegais e falha no linter. |
| 🟡 **Nível 2 - Médio** | 22 | **RESOLVIDO ✅ (0 pendências)** | Cascata de renders síncronos (*cascading renders*), lentidão inicial nas páginas e risco de *stale closures*. |
| 🔵 **Nível 3 - Baixo / Qualidade** | 11 | **9 Restantes** | Quebra do Fast Refresh (HMR) no desenvolvimento, perda de tipagem segura (`any`) e código morto. |
| **Total** | **39** | **30 Resolvidos / 9 Restantes** | **Build: 100% Aprovado (1.99s)** |

---

## 🔴 Nível 1: Crítico / Alto (Risco Funcional Imediato)

Problemas nesta categoria causam perda de dados em formulários, destruição desnecessária do DOM e quebra de regras essenciais do motor de renderização do React 19.

---

### 1. Declaração de Componente dentro do Render
* **Arquivo:** [`frontend/src/routes/index.tsx:31:8`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/routes/index.tsx#L31)
* **Regra:** `react-hooks/static-components`
* **Mensagem:** `Cannot create components during render`
* **O Problema:** A função `function Route() { ... }` está declarada **dentro** do componente `AppRoutes` e renderizada como `<Route />`. A cada renderização do `AppRoutes` (por exemplo, quando o usuário loga ou altera qualquer estado global), uma **nova função de componente é instanciada na memória**. Para o React, um componente com referência diferente significa: **desmonte toda a árvore antiga e monte uma nova do zero**.
* **Impacto:** Destrói estados internos de todas as páginas da aplicação, reseta scroll, perde dados de inputs não controlados e causa piscadas de tela (*flickers*).
* **Como Corrigir:** Extraia a função `Route` para fora do componente `AppRoutes` ou use diretamente uma função utilitária / componente separado:
  ```tsx
  // ✅ CORREÇÃO: Mover para fora do componente AppRoutes
  function UserRoleRoutes({ role }: { role?: string }) {
    switch (role) {
      case "EMPLOYEE": return <EmployeeRoutes />;
      case "ADMIN": return <AdminRoutes />;
      default: return <AuthRoutes />;
    }
  }

  export function AppRoutes() {
    const { user, isLoading } = useAuth();
    if (isLoading) return <Loading />;
    return (
      <BrowserRouter>
        <UserRoleRoutes role={user?.role} />
      </BrowserRouter>
    );
  }
  ```

---

### 2. Acesso e Mutação de Refs durante a Fase de Render
* **Arquivos:**
  1. [`frontend/src/components/Preloader.tsx:14:3`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/components/Preloader.tsx#L14)
  2. [`frontend/src/components/SpecularButton.tsx:137:3`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/components/SpecularButton.tsx#L137)
  3. [`frontend/src/components/TextType.tsx:173:5`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/components/TextType.tsx#L173)
* **Regra:** `react-hooks/refs`
* **Mensagem:** `Cannot access refs during render`
* **O Problema:** O código lê ou altera `ref.current` diretamente no corpo da função do componente, antes do retorno do JSX. No React 19 (e em renderização concorrente), a fase de renderização deve ser **pura** e livre de efeitos colaterais, pois o React pode pausar, descartar ou recalcular renders a qualquer momento.
* **Impacto:** Inconsistências visuais graves, valores de ref desatualizados ou divergentes entre renders e falha de hidratação/SSR.
* **Como Corrigir:**
  - Se a leitura da ref for para fins de renderização visual, converta a ref para um **estado comum (`useState`)**.
  - Se for para interagir com o DOM ou animações, execute o acesso à ref exclusivamente dentro de um `useEffect` ou `useLayoutEffect`.

---

### 3. Mutação Direta de Estruturas Imutáveis
* **Arquivo:** [`frontend/src/components/Silk.tsx:153:5`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/components/Silk.tsx#L153)
* **Regra:** `react-hooks/immutability`
* **Mensagem:** `This value cannot be modified`
* **O Problema:** O componente modifica diretamente um objeto/array que o React Compiler e os hooks consideram imutável.
* **Impacto:** O React não detecta mudanças quando objetos são mutados diretamente por referência, causando componentes que não atualizam na tela e comportamento imprevisível.
* **Como Corrigir:** Clone o objeto ou array antes de aplicar a alteração (`[...array]` ou `{ ...obj }`) ou use funções puras.

---

### 4. Regra Desconhecida no ESLint
* **Arquivo:** [`frontend/src/components/Silk.tsx:1:1`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/components/Silk.tsx#L1)
* **Regra:** `react/no-unknown-property`
* **Mensagem:** `Definition for rule 'react/no-unknown-property' was not found.`
* **O Problema:** O arquivo possui um comentário `/* eslint-disable react/no-unknown-property */` ou configuração de regra para um plugin que não está instalado ou declarado no `eslint.config.js` (ESLint 9 Flat Config).
* **Impacto:** Bloqueia a execução do script `npm run lint` na esteira de CI/CD do GitHub Actions.
* **Como Corrigir:** Remova o comentário desnecessário do arquivo ou instale/configure o plugin `eslint-plugin-react`.

---

## 🟡 Nível 2: Médio (Performance e Cascata de Renders)

Estes problemas não quebram a aplicação imediatamente, mas degradam a performance do usuário, provocam renders duplicados desnecessários no carregamento e criam armadilhas de estado defasado (*stale state*).

---

### 1. `setState` Síncrono dentro do corpo de `useEffect` (17 ocorrências)
* **Regra:** `react-hooks/set-state-in-effect`
* **Mensagem:** `Calling setState synchronously within an effect can trigger cascading renders`
* **O Problema:** Chamar `setState` de forma síncrona logo na primeira linha de um `useEffect` força o React a:
  1. Renderizar o componente com o valor inicial.
  2. Executar o efeito imediatamente após a pintura.
  3. Descartar o que acabou de pintar e **executar um segundo render completo em cascata**.
* **Impacto:** Dobra o trabalho da CPU no carregamento da página, provoca engasgos perceptíveis em celulares e pode entrar em loop infinito se o array de dependências não for estritamente controlado.
* **Ocorrências Detalhadas:**

| Arquivo | Linha | Variável / Chamada | Causa |
|---|---|---|---|
| [`frontend/src/components/HeroMedia.tsx`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/components/HeroMedia.tsx#L51) | 51 | `setIsLoading(false)` | Setando loading síncrono no mount. |
| [`frontend/src/components/LivenessChallenge.tsx`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/components/LivenessChallenge.tsx#L382) | 382 | `setBlinkValidated(false)` | Reset de estado acoplado a mudança de step. |
| [`frontend/src/components/MagicBento.tsx`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/components/MagicBento.tsx#L285) | 285 | `setCurrentIndex(...)` | Sincronizando prop com state em efeito. |
| [`frontend/src/components/company/EmployeeScheduleModal.tsx`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/components/company/EmployeeScheduleModal.tsx#L67) | 67 | `setSchedules(...)` | Carregamento inicial. |
| [`frontend/src/contexts/AuthContext.tsx`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/contexts/AuthContext.tsx#L112) | 112 | `setUser(...)` | Leitura de localStorage dentro do effect. |
| [`frontend/src/hooks/useCompany.ts`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/hooks/useCompany.ts#L31) | 31 | `fetchCompany()` | Disparo imediato síncrono. |
| [`frontend/src/pages/JustificativasPage.tsx`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/pages/JustificativasPage.tsx#L128) | 128 | `handleGetJustificativas()` | Disparo síncrono no mount. |
| [`frontend/src/pages/JustificativasPage.tsx`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/pages/JustificativasPage.tsx#L146) | 146 | `setHasMore(...)` | Sincronização de paginação. |
| [`frontend/src/pages/MeusDadosPage.tsx`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/pages/MeusDadosPage.tsx#L58) | 58 | `handleGetUserData()` | Disparo síncrono no mount. |
| [`frontend/src/pages/admin/ConfiguracoesPage.tsx`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/pages/admin/ConfiguracoesPage.tsx#L34) | 34 | `setFacialMode(...)` | Inicialização de form a partir de props/state. |
| [`frontend/src/pages/admin/DashboardPage.tsx`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/pages/admin/DashboardPage.tsx#L47) | 47 | `handleGetDashboard()` | Disparo síncrono no mount. |
| [`frontend/src/pages/admin/FuncionariosPage.tsx`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/pages/admin/FuncionariosPage.tsx#L61) | 61 | `handleGetEmployees()` | Disparo síncrono no mount. |
| [`frontend/src/pages/admin/HorariosPage.tsx`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/pages/admin/HorariosPage.tsx#L52) | 52 | `fetchSchedules()` | Disparo síncrono no mount. |
| [`frontend/src/pages/admin/TotemManagePage.tsx`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/pages/admin/TotemManagePage.tsx#L31) | 31 | `setHasActiveTotem(...)` | Leitura síncrona de localStorage em effect. |
| [`frontend/src/pages/loginPage.tsx`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/pages/loginPage.tsx#L30) | 30 | `setEmail(savedEmail)` | Leitura síncrona de localStorage em effect. |
| [`frontend/src/pages/pontoPage.tsx`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/pages/pontoPage.tsx#L323) | 323 | `setHasFaceRegistered(...)` | Sincronização síncrona de prop para state. |
| [`frontend/src/pages/pontoViewPage.tsx`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/pages/pontoViewPage.tsx#L182) | 182 | `handleGetPontos()` | Disparo síncrono no mount. |

* **Como Corrigir:**
  1. **Para dados vindos de `localStorage` ou cookies:** Use *lazy state initialization*:
     ```tsx
     // ❌ ANTES (provoca cascading render)
     const [email, setEmail] = useState("");
     useEffect(() => {
       const saved = localStorage.getItem("email");
       if (saved) setEmail(saved);
     }, []);

     // ✅ DEPOIS (zero cascading renders - inicializa no 1º frame)
     const [email, setEmail] = useState(() => localStorage.getItem("email") || "");
     ```
  2. **Para dados derivados de `props` ou outro `state`:** Calcule diretamente durante a renderização (sem state duplicado):
     ```tsx
     // ❌ ANTES
     const [hasFace, setHasFace] = useState(false);
     useEffect(() => setHasFace(!!user?.hasFaceDescriptor), [user]);

     // ✅ DEPOIS (elimina um state e um effect)
     const hasFace = Boolean(user?.hasFaceDescriptor);
     ```
  3. **Para chamadas de API (`fetchSchedules`, `handleGetPontos`):** Assegure que a função de busca seja assíncrona e o `setState` ocorra apenas na resolução dos dados, ou utilize React Query / hooks de SWR.

---

### 2. Dependências Incompletas em Hooks (`exhaustive-deps`) (5 ocorrências)
* **Regra:** `react-hooks/exhaustive-deps`
* **O Problema:** Hooks (`useEffect` e `useCallback`) que consomem variáveis ou funções sem declará-las no array de dependências, ou que usam refs mutáveis no cleanup.
* **Impacto:** *Stale closures* (o efeito usa valores antigos de variáveis congeladas no momento da montagem), ou cleanup que tenta fechar recursos em refs que já mudaram de valor.
* **Ocorrências Detalhadas:**
  1. [`frontend/src/components/FaceAuth.tsx:66:41`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/components/FaceAuth.tsx#L66)
     * *Problema:* `videoRef.current` usado na função de cleanup do efeito.
     * *Correção:* Copiar para uma variável local: `const currentVideo = videoRef.current; return () => { currentVideo?.srcObject = null; };`.
  2. [`frontend/src/components/LivenessChallenge.tsx:426:6`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/components/LivenessChallenge.tsx#L426)
     * *Problema:* `ringMotionVal` (MotionValue do Framer Motion) é estável e não precisa estar nas dependências do `useCallback`.
     * *Correção:* Remover `ringMotionVal` da lista de dependências.
  3. [`frontend/src/components/TextType.tsx:151:6`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/components/TextType.tsx#L151)
     * *Problema:* Dependência `getRandomSpeed` ausente.
     * *Correção:* Envolver `getRandomSpeed` com `useCallback` e adicionar ao array.
  4. [`frontend/src/pages/RegisterFace.tsx:69:8`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/pages/RegisterFace.tsx#L69)
     * *Problema:* Dependência `check` ausente.
     * *Correção:* Incluir `check` ou refatorar a guarda de inicialização.
  5. [`frontend/src/pages/pontoPage.tsx:325:8`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/pages/pontoPage.tsx#L325)
     * *Problema:* Dependências `handleGetCheckin` e `user?.hasFaceDescriptor` ausentes no `useEffect` de montagem.
     * *Correção:* Isolar a busca de checkins ou utilizar `handleGetCheckin` envolto em `useCallback`.

---

## 🔵 Nível 3: Baixo / Qualidade de Código (DX e Tipagem)

Não afetam o comportamento do usuário final em produção, mas prejudicam a experiência do desenvolvedor (DX), quebram o recarregamento rápido do Vite e reduzem a proteção estática do TypeScript.

---

### 1. Quebra de Fast Refresh no Vite (`only-export-components`) (3 ocorrências)
* **Arquivos:**
  - [`frontend/src/contexts/AuthContext.tsx:242:17`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/contexts/AuthContext.tsx#L242) e [`linha 250`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/contexts/AuthContext.tsx#L250)
  - [`frontend/src/contexts/ThemeContext.tsx:76:17`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/contexts/ThemeContext.tsx#L76)
* **Regra:** `react-refresh/only-export-components`
* **O Problema:** Arquivos `.tsx` que exportam componentes (`AuthProvider`, `ThemeProvider`) e, no mesmo arquivo, exportam funções ou constantes (como o hook `useAuth`, `useTheme`).
* **Impacto:** O plugin de HMR do Vite não consegue aplicar hot-reload cirúrgico nesses arquivos durante o desenvolvimento. Toda vez que você salva uma alteração nesses contexts, o navegador faz um **recarregamento completo da página (Full Reload)**, perdendo o estado atual de navegação.
* **Como Corrigir:**
  - Mova o hook `useAuth` para seu próprio arquivo: `frontend/src/hooks/useAuth.ts`.
  - Mova o hook `useTheme` para `frontend/src/hooks/useTheme.ts`.

---

### 2. Uso de Tipo `any` Explícito (4 ocorrências)
* **Arquivos:**
  - [`frontend/src/components/GradientWaves.tsx:345:59`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/components/GradientWaves.tsx#L345)
  - [`frontend/src/components/Silk.tsx:27:31`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/components/Silk.tsx#L27)
  - [`frontend/src/components/company/AcceptInvitePage.tsx:75:12`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/components/company/AcceptInvitePage.tsx#L75)
  - [`frontend/src/pages/CompanyManagePage.tsx:95:58`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/pages/CompanyManagePage.tsx#L95)
* **Regra:** `@typescript-eslint/no-explicit-any`
* **O Problema:** Uso da palavra-chave `any` para escapar da checagem de tipos do TypeScript.
* **Impacto:** Remove o autocomplete e anula a detecção de erros em tempo de compilação nesses pontos.
* **Como Corrigir:** Substitua por interfaces tipadas específicas, tipos genéricos ou `unknown` (acompanhado de type guard).

---

### 3. Expressões Inúteis e Blocos Vazios (3 ocorrências)
* **Arquivos:**
  - [`frontend/src/components/GradientWaves.tsx:310:9`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/components/GradientWaves.tsx#L310) (`@typescript-eslint/no-unused-expressions`)
  - [`frontend/src/components/GradientWaves.tsx:318:7`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/components/GradientWaves.tsx#L318) (`@typescript-eslint/no-unused-expressions`)
  - [`frontend/src/components/GradientWaves.tsx:334:15`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/components/GradientWaves.tsx#L334) (`no-empty`)
* **O Problema:** Chamadas WebGL que retornam valores mas não são atribuídas a variáveis nem utilizadas, além de um bloco `catch {}` sem tratamento.
* **Impacto:** Código confuso, potencial desperdício de instrução ou erro engolido silenciosamente.
* **Como Corrigir:** Atribua o resultado a uma constante caso seja necessário ou adicione um log mínimo no catch.

---

### 4. Variável Declarada e Não Utilizada (1 ocorrência)
* **Arquivo:** [`frontend/src/contexts/AuthContext.tsx:136:68`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/frontend/src/contexts/AuthContext.tsx#L136)
* **Regra:** `@typescript-eslint/no-unused-vars`
* **Mensagem:** `'_newCompany' is defined but never used.`
* **O Problema:** Parâmetro recebido na função que não é lido em nenhum momento.
* **Como Corrigir:** Remova o parâmetro ou utilize-o se deveria fazer parte da lógica de atualização.

---

## 🎯 Recomendações de Priorização

1. **Ação Imediata (Sprint Atual):**
   - Corrigir o `frontend/src/routes/index.tsx` (evita desmontagem completa de telas e perda de foco).
   - Remover a regra quebrada em `frontend/src/components/Silk.tsx` para destravar a esteira de lint.
   - Tratar os 3 acessos a refs durante o render (`Preloader.tsx`, `SpecularButton.tsx`, `TextType.tsx`).

2. **Ação de Médio Prazo:**
   - Padronizar a leitura de `localStorage` para dentro do `useState(() => ...)` nas páginas de login e totem, eliminando os *cascading renders*.
   - Mover os hooks `useAuth` e `useTheme` para arquivos próprios para restaurar o Fast Refresh do Vite.

3. **Manutenção Preventiva:**
   - Tipar adequadamente os 4 pontos com `any` para manter o padrão rigoroso de TypeScript.
