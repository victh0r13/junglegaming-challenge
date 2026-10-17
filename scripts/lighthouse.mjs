import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUTPUT = path.join(ROOT, 'lighthouse')
const PRESETS = ['mobile', 'desktop']
const PAGES = { '/': 'inicio', '/nft/emerald-ape-042': 'detalhe' }
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const TARGETS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }
const METRICS = {
  LCP: 'largest-contentful-paint',
  CLS: 'cumulative-layout-shift',
  TBT: 'total-blocking-time',
  FCP: 'first-contentful-paint',
  SI: 'speed-index',
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function pageName(url) {
  return PAGES[new URL(url).pathname] ?? new URL(url).pathname.replace(/\W+/g, '-')
}

function runPreset(preset) {
  const dir = path.join(OUTPUT, preset)
  rmSync(dir, { recursive: true, force: true })
  rmSync(path.join(ROOT, '.lighthouseci'), { recursive: true, force: true })
  const result = spawnSync('pnpm', ['exec', 'lhci', 'autorun'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, LH_PRESET: preset },
  })
  return result.status === 0
}

function summarize(preset) {
  const dir = path.join(OUTPUT, preset)
  const manifest = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
  const pages = {}

  for (const entry of manifest) {
    const name = pageName(entry.url)
    const report = JSON.parse(readFileSync(entry.jsonPath, 'utf8'))
    const run = {
      scores: Object.fromEntries(CATEGORIES.map((key) => [key, Math.round(report.categories[key].score * 100)])),
      metrics: Object.fromEntries(Object.entries(METRICS).map(([label, id]) => [label, report.audits[id].numericValue])),
    }
    pages[name] ??= { url: entry.url, runs: [] }
    pages[name].runs.push(run)
    if (entry.isRepresentativeRun) {
      copyFileSync(entry.jsonPath, path.join(dir, `${name}.report.json`))
      copyFileSync(entry.htmlPath, path.join(dir, `${name}.report.html`))
    }
  }

  for (const entry of manifest) {
    rmSync(entry.jsonPath, { force: true })
    rmSync(entry.htmlPath, { force: true })
  }
  rmSync(path.join(dir, 'manifest.json'), { force: true })

  for (const page of Object.values(pages)) {
    page.median = {
      scores: Object.fromEntries(CATEGORIES.map((key) => [key, median(page.runs.map((run) => run.scores[key]))])),
      metrics: Object.fromEntries(Object.keys(METRICS).map((label) => [label, median(page.runs.map((run) => run.metrics[label]))])),
    }
  }
  return pages
}

function formatMetric(label, value) {
  if (label === 'CLS') return value.toFixed(3)
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`
}

function toMarkdown(summary, generatedAt) {
  const lines = [
    '# Lighthouse',
    '',
    `Gerado em ${generatedAt} com \`pnpm lighthouse\` (build de produção servido por \`vite preview\`, 3 execuções por página, valores medianos).`,
    '',
    '| Perfil | Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT | FCP |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ]
  for (const [preset, pages] of Object.entries(summary)) {
    for (const [name, page] of Object.entries(pages)) {
      const { scores, metrics } = page.median
      const score = (key) => `${scores[key]}${scores[key] < TARGETS[key] ? ' ⚠️' : ''}`
      lines.push(
        `| ${preset} | ${name} | ${score('performance')} | ${score('accessibility')} | ${score('best-practices')} | ${score('seo')} | ${formatMetric('LCP', metrics.LCP)} | ${formatMetric('CLS', metrics.CLS)} | ${formatMetric('TBT', metrics.TBT)} | ${formatMetric('FCP', metrics.FCP)} |`,
      )
    }
  }
  lines.push('', 'Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90. ⚠️ indica valor abaixo da meta.', '')
  lines.push('Todas as execuções:', '')
  for (const [preset, pages] of Object.entries(summary)) {
    for (const [name, page] of Object.entries(pages)) {
      const values = page.runs.map((run) => `${run.scores.performance} (LCP ${formatMetric('LCP', run.metrics.LCP)}, TBT ${formatMetric('TBT', run.metrics.TBT)})`)
      lines.push(`- ${preset} / ${name}: ${values.join(' · ')}`)
    }
  }
  return `${lines.join('\n')}\n`
}

mkdirSync(OUTPUT, { recursive: true })
const summary = {}
let passed = true
for (const preset of PRESETS) {
  passed = runPreset(preset) && passed
  if (existsSync(path.join(OUTPUT, preset, 'manifest.json'))) summary[preset] = summarize(preset)
}
rmSync(path.join(ROOT, '.lighthouseci'), { recursive: true, force: true })

const generatedAt = new Date().toISOString().slice(0, 10)
writeFileSync(path.join(OUTPUT, 'resumo.json'), `${JSON.stringify({ generatedAt, summary }, null, 2)}\n`)
writeFileSync(path.join(OUTPUT, 'RESUMO.md'), toMarkdown(summary, generatedAt))
console.log(readFileSync(path.join(OUTPUT, 'RESUMO.md'), 'utf8'))
process.exitCode = passed ? 0 : 1
