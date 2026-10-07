export interface QuoteInput {
  from: string
  to: string
  amount: number
}

export interface Quote extends QuoteInput {
  rate: string
  createdAt: string
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function getCurrencies(signal: AbortSignal): Promise<string[]> {
  const response = await fetch('/api/rates', { signal })
  if (!response.ok) throw new Error(`Failed to load currencies: ${response.status}`)
  const data: unknown = await response.json()
  if (
    !isObject(data) ||
    !Array.isArray(data.currencies) ||
    data.currencies.length === 0 ||
    data.currencies.some((currency: unknown) => typeof currency !== 'string' || !currency.trim())
  ) {
    throw new Error('No valid currencies are available.')
  }
  return [...new Set(data.currencies as string[])]
}

export async function getQuote(input: QuoteInput, signal: AbortSignal): Promise<Quote> {
  if (!Number.isFinite(input.amount) || input.amount < 0) throw new Error('Enter a valid amount.')
  const response = await fetch('/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  })
  if (!response.ok) throw new Error(`Quote request failed: ${response.status}`)
  const data: unknown = await response.json()
  if (
    !isObject(data) ||
    data.from !== input.from ||
    data.to !== input.to ||
    data.amount !== input.amount
  ) {
    throw new Error('The quote does not match the requested conversion.')
  }
  if (
    typeof data.rate !== 'string' ||
    !/^\d+(?:\.\d+)?$/.test(data.rate) ||
    !Number.isFinite(Number(data.rate)) ||
    Number(data.rate) <= 0 ||
    !Number.isFinite(input.amount * Number(data.rate)) ||
    typeof data.createdAt !== 'string' ||
    !data.createdAt.trim() ||
    !Number.isFinite(Date.parse(data.createdAt))
  ) {
    throw new Error('The quote response is invalid.')
  }
  return { ...input, rate: data.rate, createdAt: data.createdAt }
}
