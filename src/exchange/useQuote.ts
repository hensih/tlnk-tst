import { useEffect, useState } from 'react'
import { getQuote, type Quote } from './api'
import { convert, formatMoney, parseAmount } from '../shared/money'

interface QuoteState {
  key: string
  quote: Quote | null
  result: string | null
  error: string | null
}

export function useQuote(
  amount: string,
  from: string,
  to: string,
  refresh: number,
  enabled: boolean,
) {
  const numericAmount = parseAmount(amount)
  const key = JSON.stringify([amount, from, to, refresh])
  const [state, setState] = useState<QuoteState | null>(null)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    setState({ key, quote: null, result: null, error: null })

    async function requestQuote() {
      try {
        const quote = await getQuote({ from, to, amount: numericAmount }, controller.signal)
        const converted = convert(quote.amount, quote.rate)
        if (!controller.signal.aborted) {
          setState({ key, quote, result: formatMoney(converted), error: null })
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({
            key,
            quote: null,
            result: null,
            error: error instanceof Error ? error.message : 'Unable to load a quote.',
          })
        }
      }
    }

    void requestQuote()
    return () => controller.abort()
  }, [key, numericAmount, from, to, enabled])

  const current = enabled && state?.key === key ? state : null
  return {
    quote: current?.quote ?? null,
    result: current?.result ?? null,
    error: current?.error ?? null,
    loading: enabled && !current?.quote && !current?.error,
  }
}
