const preset = process.env.LH_PRESET === 'desktop' ? 'desktop' : 'mobile'
const port = 4174
const base = `http://localhost:${port}`

module.exports = {
  ci: {
    collect: {
      startServerCommand: `pnpm preview --port ${port} --strictPort`,
      startServerReadyPattern: `localhost:${port}`,
      url: [`${base}/`, `${base}/nft/emerald-ape-042`],
      numberOfRuns: 3,
      chromePath: process.env.CHROME_PATH || undefined,
      settings: {
        ...(preset === 'desktop' ? { preset: 'desktop' } : {}),
        chromeFlags: '--no-sandbox --headless=new',
        locale: 'pt-BR',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9, aggregationMethod: 'median-run' }],
        'categories:accessibility': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
        'categories:best-practices': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
        'categories:seo': ['error', { minScore: 0.9, aggregationMethod: 'median-run' }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: `lighthouse/${preset}`,
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%.report.%%EXTENSION%%',
    },
  },
}
