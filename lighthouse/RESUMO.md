# Lighthouse

Gerado em 2026-10-17 com `pnpm lighthouse` (build de produção servido por `vite preview`, 3 execuções por página, valores medianos).

| Perfil | Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT | FCP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mobile | inicio | 78 ⚠️ | 100 | 100 | 100 | 4.02 s | 0.033 | 277 ms | 2.45 s |
| mobile | detalhe | 81 ⚠️ | 100 | 100 | 100 | 4.02 s | 0.000 | 159 ms | 2.77 s |
| desktop | inicio | 99 | 100 | 100 | 100 | 941 ms | 0.001 | 9 ms | 608 ms |
| desktop | detalhe | 99 | 100 | 100 | 100 | 929 ms | 0.000 | 0 ms | 611 ms |

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90. ⚠️ indica valor abaixo da meta.

Todas as execuções:

- mobile / inicio: 79 (LCP 4.02 s, TBT 248 ms) · 75 (LCP 4.17 s, TBT 341 ms) · 78 (LCP 4.01 s, TBT 277 ms)
- mobile / detalhe: 80 (LCP 4.02 s, TBT 164 ms) · 83 (LCP 3.76 s, TBT 159 ms) · 81 (LCP 4.02 s, TBT 133 ms)
- desktop / inicio: 99 (LCP 940 ms, TBT 9 ms) · 99 (LCP 996 ms, TBT 17 ms) · 99 (LCP 941 ms, TBT 3 ms)
- desktop / detalhe: 99 (LCP 904 ms, TBT 0 ms) · 99 (LCP 963 ms, TBT 12 ms) · 99 (LCP 929 ms, TBT 0 ms)
