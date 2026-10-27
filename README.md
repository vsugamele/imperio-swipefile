# ⚡ Império Swipefile — Clones 1:1 + Animações (Vercel & GitHub)

Repositório central de clones interativos de alta fidelidade do **Império System** (`/sites` e `/referencias`).

🔗 **Hub Ao Vivo (Vercel):** [https://imperio-swipefile.vercel.app](https://imperio-swipefile.vercel.app)

## Arquitetura
- **`index.html`**: Showcase interativo com busca, filtro por categoria/fidelidade e acesso rápido ao Clone Vercel, pasta no GitHub e URL original.
- **`sites/<slug>/index.html`**: Cada site clonado 1:1 em sua própria rota dedicada (`https://imperio-swipefile.vercel.app/<slug>/`), com DOM hidratado, regras CSSOM inlined e motor de animações ativo.
- **`assets/imperio-animation-engine.js` & `.css`**: Motor universal 60fps de animações (IntersectionObserver scroll-reveal, desbloqueio de `opacity: 0` / `.elementor-invisible` / `[data-aos]`, accordions de FAQ, hover 3D em cards, shimmer em CTAs e HUD flutuante com Replay de Animações).
- **`scripts/clone-swipe-br.mjs`**: Pipeline automatizado Playwright + CSSOM Serializer + fallback inteligente do Cofre Supabase (`imphq_sites`).
