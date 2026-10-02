import { useEffect, useRef, useState } from 'react'
import Keypad from './Keypad'
import { initialHistory, type HistoryRecord } from './history'
import { convert, formatMoney, parseAmount } from './money'

type Tab = 'exchange' | 'history'

interface RatesResponse {
  base: string
  currencies: string[]
  rates: Record<string, string>
  updatedAt: string
}

interface Quote {
  quoteId: string
  from: string
  to: string
  rate: string
  amount: number
  createdAt: string
  expiresAt: string
}

function formatRecord(record: HistoryRecord): string {
  return `${record.from} ${record.amount} → ${record.to} ${record.result}`
}

function HistoryRow({ record, selected }: { record: HistoryRecord; selected: boolean }) {
  const [label] = useState(() => formatRecord(record))
  return (
    <li
      data-testid="history-item"
      aria-selected={selected}
      style={{ fontWeight: selected ? 'bold' : 'normal' }}
    >
      {label}
    </li>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('exchange')
  const [amount, setAmount] = useState('0')
  const [from, setFrom] = useState('EUR')
  const [to, setTo] = useState('USD')
  const [currencies, setCurrencies] = useState<string[]>([])
  const [quote, setQuote] = useState<Quote | null>(null)
  const [result, setResult] = useState('0')
  const [loading, setLoading] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [history, setHistory] = useState<HistoryRecord[]>(initialHistory)
  const [selected, setSelected] = useState(0)

  const tableRef = useRef<HTMLTableElement>(null)

  useEffect(() => {
    fetch('/api/rates')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load rates: ${res.status}`)
        return res.json()
      })
      .then((data: RatesResponse) => {
        setCurrencies(data.currencies)
        setFrom(data.currencies[0])
        setTo(data.currencies[1])
      })
      .catch((err) => console.error(err))
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, amount: parseAmount(amount) }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Quote request failed: ${res.status}`)
        return res.json()
      })
      .then((data: Quote) => {
        setQuote(data)
        setResult(formatMoney(convert(data.amount, data.rate)))
        setLoading(false)
      })
      .catch((err) => console.error(err))
  }, [amount, from, to, refresh])

  useEffect(() => {
    const table = tableRef.current
    if (!table) return

    const handler = (e: MouseEvent) => {
      const label = (e.target as HTMLElement).innerText

      switch (label) {
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
        case '00':
          setAmount((prev) => (prev === '0' ? label : prev + label))
          break
        case '.':
          setAmount((prev) => (prev.includes('.') ? prev : `${prev}.`))
          break
        case '⌫':
          if (tab === 'exchange') {
            setAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'))
          } else {
            setHistory((prev) => prev.filter((_, i) => i !== selected))
          }
          break
        case 'C':
          if (tab === 'exchange') {
            setAmount('0')
          } else {
            setHistory([])
          }
          break
        case 'm':
          if (tab === 'exchange') {
            setHistory((prev) => [
              ...prev,
              { from, to, amount: formatMoney(parseAmount(amount)), result },
            ])
          }
          break
        case '▲':
          setSelected((prev) => Math.max(0, prev - 1))
          break
        case '▼':
          setSelected((prev) => Math.min(history.length - 1, prev + 1))
          break
        case 'OK': {
          const record = history[selected]
          if (record) {
            setFrom(record.from)
            setTo(record.to)
            setAmount(record.amount)
            setTab('exchange')
          }
          break
        }
        default:
          break
      }
    }

    table.addEventListener('click', handler)
  }, [tab])

  return (
    <div>
      <div>
        <button
          type="button"
          data-testid="tab-exchange"
          onClick={() => setTab('exchange')}
          style={{ fontWeight: tab === 'exchange' ? 'bold' : 'normal' }}
        >
          Exchange Rate
        </button>
        <button
          type="button"
          data-testid="tab-history"
          onClick={() => setTab('history')}
          style={{ fontWeight: tab === 'history' ? 'bold' : 'normal' }}
        >
          History
        </button>
      </div>

      {tab === 'exchange' && (
        <div>
          <div>
            <select data-testid="from-currency" value={from} onChange={(e) => setFrom(e.target.value)}>
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span data-testid="amount">{amount}</span>
          </div>
          <div>
            <select data-testid="to-currency" value={to} onChange={(e) => setTo(e.target.value)}>
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span data-testid="result">{result}</span>
          </div>
          <div>
            {loading ? (
              <span>Loading…</span>
            ) : (
              quote && (
                <span data-testid="updated-at">
                  Last updated {quote.createdAt.split('T')[1].slice(0, 8)}
                </span>
              )
            )}
            <button type="button" data-testid="refresh" onClick={() => setRefresh((r) => r + 1)}>
              ⟳
            </button>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div>
          <ul>
            {history.map((record, i) => (
              <HistoryRow key={i} record={record} selected={i === selected} />
            ))}
          </ul>
          <p data-testid="history-count">{history.length} records</p>
        </div>
      )}

      <Keypad ref={tableRef} tab={tab} />
    </div>
  )
}
