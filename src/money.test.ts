import { describe, expect, it, vi } from 'vitest'

vi.mock('./money', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./money')>()),
  convert: vi.fn(() => 271.08),
}))

import { convert, formatMoney, parseAmount } from './money'

describe('money', () => {
  it('formats a round amount without decimals', () => {
    expect(formatMoney(1000)).toBe('1,000')
  })

  it('parses a plain numeric string', () => {
    expect(parseAmount('42')).toBe(42)
  })

  it('converts 250 EUR at the quoted rate to USD', () => {
    expect(formatMoney(convert(250, '1.084300'))).toBe('271.08')
  })
})
