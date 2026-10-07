import { describe, expect, it } from 'vitest'
import { convert, formatMoney, parseAmount } from './money'

describe('money', () => {
  it('formats a round amount without decimals', () => {
    expect(formatMoney(1000)).toBe('1,000')
  })

  it.each([
    [1.005, '1.01'],
    [1271.72, '1,271.72'],
    [12.5, '12.5'],
    [0, '0'],
  ])('formats %s as %s', (amount, expected) => {
    expect(formatMoney(amount)).toBe(expected)
  })

  it('parses a plain numeric string', () => {
    expect(parseAmount('42')).toBe(42)
  })

  it('converts 250 EUR at the quoted rate to USD', () => {
    const result = convert(250, '1.084300')
    expect(result).toBeCloseTo(271.075, 8)
    expect(formatMoney(result)).toBe('271.08')
  })

  it.each([
    [0, '1.084300', 0],
    [100, '0.922250', 92.225],
    [12.5, '2.000000', 25],
  ])('converts %s at rate %s to %s', (amount, rate, expected) => {
    expect(convert(amount, rate)).toBeCloseTo(expected, 8)
  })
})
