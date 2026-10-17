# Lighthouse

Gerado em 2026-10-17 com `pnpm lighthouse` (build de produção servido por `vite preview`, mocks ligados no cenário `padrao`, 3 execuções por página, valores medianos).

| Perfil | Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT | FCP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mobile | inicio | 80 ⚠️ | 100 | 100 | 100 | 4.18 s | 0.019 | 211 ms | 2.39 s |
| mobile | detalhe | 82 ⚠️ | 100 | 100 | 100 | 3.99 s | 0.000 | 114 ms | 2.72 s |
| desktop | inicio | 99 | 100 | 100 | 100 | 953 ms | 0.000 | 3 ms | 605 ms |
| desktop | detalhe | 99 | 100 | 100 | 100 | 916 ms | 0.000 | 0 ms | 594 ms |

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90. ⚠️ indica valor abaixo da meta.

Todas as execuções:

- mobile / inicio: 75 (LCP 4.25 s, TBT 337 ms) · 82 (LCP 4.02 s, TBT 167 ms) · 80 (LCP 4.18 s, TBT 211 ms)
- mobile / detalhe: 81 (LCP 4.02 s, TBT 159 ms) · 84 (LCP 3.74 s, TBT 99 ms) · 82 (LCP 3.99 s, TBT 114 ms)
- desktop / inicio: 99 (LCP 953 ms, TBT 0 ms) · 99 (LCP 952 ms, TBT 5 ms) · 99 (LCP 953 ms, TBT 3 ms)
- desktop / detalhe: 99 (LCP 924 ms, TBT 0 ms) · 99 (LCP 887 ms, TBT 0 ms) · 99 (LCP 916 ms, TBT 0 ms)

## Ferramentas e ambiente

- Node v22.22.0, @lhci/cli 0.15.1, Vite 8.3.4
- Sistema: Linux 6.18.44-fc-v139 (x64); CPU: Intel(R) Xeon(R) Processor @ 2.80GHz

## Condições de execução

| Perfil | Lighthouse | Navegador | Tela | Throttling | RTT | Banda | CPU | Benchmark |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mobile | 12.6.1 | HeadlessChrome/141.0.0.0 | 412×823 @1.75x | simulate | 150 ms | 1638 Kbps | 4× | 1972 |
| desktop | 12.6.1 | HeadlessChrome/141.0.0.0 | 1350×940 @1x | simulate | 40 ms | 10240 Kbps | 1× | 2160 |

Throttling `simulate` é o padrão do Lighthouse: a página carrega sem limite e as métricas são recalculadas para a rede e a CPU indicadas.
