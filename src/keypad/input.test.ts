import { describe, expect, it } from 'vitest'
import { editAmount, type AmountAction } from './input'

describe('amount editing', () => {
  it('limits total digits without truncating the existing amount', () => {
    expect(editAmount('123456789012', { type: 'digit', value: '3' })).toBe('123456789012')
    expect(editAmount('12345678901', { type: 'digit', value: '00' })).toBe('12345678901')
    expect(editAmount('12345678.901', { type: 'digit', value: '2' })).toBe('12345678.9012')
    expect(editAmount('12345678.9012', { type: 'digit', value: '3' })).toBe('12345678.9012')
    expect(editAmount('123456789012', { type: 'backspace' })).toBe('12345678901')
  })
  it.each<[string, AmountAction, string]>([
    ['0', { type: 'digit', value: '00' }, '0'],
    ['0', { type: 'digit', value: '7' }, '7'],
    ['12', { type: 'digit', value: '00' }, '1200'],
    ['0', { type: 'decimal' }, '0.'],
    ['1.', { type: 'decimal' }, '1.'],
    ['1.230', { type: 'digit', value: '0' }, '1.2300'],
    ['1.2300', { type: 'backspace' }, '1.230'],
    ['1.', { type: 'backspace' }, '1'],
    ['7', { type: 'backspace' }, '0'],
    ['0', { type: 'backspace' }, '0'],
    ['123.45', { type: 'clear' }, '0'],
  ])('edits %s with %j to %s', (current, action, expected) => {
    expect(editAmount(current, action)).toBe(expected)
  })
})
