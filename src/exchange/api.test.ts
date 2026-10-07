import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCurrencies, getQuote } from './api'

const input = { from: 'EUR', to: 'USD', amount: 12 }
const validQuote = { ...input, rate: '1.084300', createdAt: '2026-10-07T12:00:00Z' }
const signal = () => new AbortController().signal

function respond(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status < 400,
      status,
      json: async () => body,
    }),
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('API boundaries', () => {
  it('returns validated quote data and forwards the request and cancellation signal', async () => {
    respond(validQuote)
    const requestSignal = signal()
    expect(await getQuote(input, requestSignal)).toEqual(validQuote)
    expect(fetch).toHaveBeenCalledWith('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: requestSignal,
    })
  })

  it.each([null, [], {}, { ...validQuote, to: 'GBP' }, { ...validQuote, amount: 13 }])(
    'rejects mismatched or missing conversion data: %j',
    async (body) => {
      respond(body)
      await expect(getQuote(input, signal())).rejects.toThrow('does not match')
    },
  )

  it.each([
    { rate: '2abc' },
    { rate: '' },
    { rate: 'Infinity' },
    { rate: '0' },
    { rate: '-2' },
    { rate: 2 },
    { rate: '9'.repeat(400) },
    { createdAt: undefined },
    { createdAt: null },
    { createdAt: 'invalid' },
  ])('rejects malformed quote fields: %j', async (fields) => {
    respond({ ...validQuote, ...fields })
    await expect(getQuote(input, signal())).rejects.toThrow('response is invalid')
  })

  it('rejects conversion overflow', async () => {
    respond({ ...validQuote, amount: Number.MAX_VALUE, rate: '2' })
    await expect(getQuote({ ...input, amount: Number.MAX_VALUE }, signal())).rejects.toThrow(
      'response is invalid',
    )
  })

  it.each([NaN, Infinity, -1])('rejects invalid input %s before fetching', async (amount) => {
    respond(validQuote)
    await expect(getQuote({ ...input, amount }, signal())).rejects.toThrow('valid amount')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('deduplicates valid currencies and forwards cancellation', async () => {
    respond({ currencies: ['EUR', 'USD', 'EUR'] })
    const requestSignal = signal()
    expect(await getCurrencies(requestSignal)).toEqual(['EUR', 'USD'])
    expect(fetch).toHaveBeenCalledWith('/api/rates', { signal: requestSignal })
  })

  it.each([
    null,
    {},
    { currencies: [] },
    { currencies: [''] },
    { currencies: [' '] },
    { currencies: ['EUR', 12] },
  ])('rejects malformed currencies: %j', async (body) => {
    respond(body)
    await expect(getCurrencies(signal())).rejects.toThrow('No valid currencies')
  })

  it('preserves HTTP errors', async () => {
    respond({}, 503)
    await expect(getCurrencies(signal())).rejects.toThrow('Failed to load currencies: 503')
    await expect(getQuote(input, signal())).rejects.toThrow('Quote request failed: 503')
  })
})
