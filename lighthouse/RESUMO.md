# Lighthouse

Gerado em 2026-10-17 com `pnpm lighthouse` (build de produção servido por `vite preview`, 3 execuções por página, valores medianos).

| Perfil | Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT | FCP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mobile | inicio | 79 ⚠️ | 100 | 100 | 100 | 3.99 s | 0.019 | 257 ms | 2.46 s |
| mobile | detalhe | 82 ⚠️ | 100 | 100 | 100 | 3.98 s | 0.000 | 156 ms | 2.68 s |
| desktop | inicio | 99 | 100 | 100 | 100 | 968 ms | 0.000 | 5 ms | 608 ms |
| desktop | detalhe | 99 | 100 | 100 | 100 | 913 ms | 0.000 | 0 ms | 589 ms |

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90. ⚠️ indica valor abaixo da meta.

Todas as execuções:

- mobile / inicio: 79 (LCP 4.01 s, TBT 257 ms) · 77 (LCP 3.99 s, TBT 335 ms) · 80 (LCP 3.97 s, TBT 245 ms)
- mobile / detalhe: 81 (LCP 3.99 s, TBT 189 ms) · 84 (LCP 3.77 s, TBT 113 ms) · 82 (LCP 3.98 s, TBT 156 ms)
- desktop / inicio: 99 (LCP 983 ms, TBT 1 ms) · 99 (LCP 933 ms, TBT 5 ms) · 99 (LCP 968 ms, TBT 14 ms)
- desktop / detalhe: 99 (LCP 942 ms, TBT 0 ms) · 99 (LCP 888 ms, TBT 0 ms) · 99 (LCP 913 ms, TBT 0 ms)
