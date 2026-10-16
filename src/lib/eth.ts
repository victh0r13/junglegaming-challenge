const DECIMALS = 18
const SCALE = 10n ** BigInt(DECIMALS)
const ETH_PATTERN = /^\d+(\.\d{1,18})?$/

export type Eth = string

export function isEth(value: string): boolean {
  return ETH_PATTERN.test(value)
}

export function toWei(value: Eth): bigint {
  if (!isEth(value)) throw new Error(`Valor em ETH inválido: "${value}"`)
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(DECIMALS, '0'))
}

export function fromWei(wei: bigint): Eth {
  const negative = wei < 0n
  const abs = negative ? -wei : wei
  const whole = abs / SCALE
  const fraction = (abs % SCALE).toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`
}

export function addEth(...values: Eth[]): Eth {
  return fromWei(values.reduce((sum, value) => sum + toWei(value), 0n))
}

export function subtractEth(a: Eth, b: Eth): Eth {
  return fromWei(toWei(a) - toWei(b))
}

export function multiplyEth(value: Eth, quantity: number): Eth {
  if (!Number.isInteger(quantity)) throw new Error('Quantidade deve ser inteira')
  return fromWei(toWei(value) * BigInt(quantity))
}

export function percentOfEth(value: Eth, basisPoints: number): Eth {
  return fromWei((toWei(value) * BigInt(basisPoints)) / 10_000n)
}

export function compareEth(a: Eth, b: Eth): -1 | 0 | 1 {
  const diff = toWei(a) - toWei(b)
  return diff === 0n ? 0 : diff > 0n ? 1 : -1
}

export function minEth(a: Eth, b: Eth): Eth {
  return compareEth(a, b) <= 0 ? a : b
}

type FormatOptions = {
  minFractionDigits?: number
  maxFractionDigits?: number
}

export function formatEth(value: Eth, { minFractionDigits = 2, maxFractionDigits = 4 }: FormatOptions = {}): string {
  const wei = toWei(value.startsWith('-') ? value.slice(1) : value)
  const sign = value.startsWith('-') ? '-' : ''
  const step = 10n ** BigInt(DECIMALS - maxFractionDigits)
  const rounded = ((wei + step / 2n) / step) * step
  const [whole, fraction = ''] = fromWei(rounded).split('.')
  return `${sign}${whole}.${fraction.padEnd(minFractionDigits, '0')}`.replace(/\.$/, '')
}
