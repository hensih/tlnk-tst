import { useEffect, useReducer, useRef, useState } from 'react'
import styles from './App.module.css'
import Keypad from '../keypad/Keypad'
import { getCurrencies } from '../exchange/api'
import { editAmount, type KeypadAction } from '../keypad/input'
import { historyReducer, initialHistoryState, type HistoryRecord } from '../history/history'
import { formatMoney, parseAmount } from '../shared/money'
import { useQuote } from '../exchange/useQuote'

type Tab = 'exchange' | 'history'

function formatUpdatedAt(createdAt: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60_000))

  if (minutes === 0) return 'Last updated just now'
  if (minutes < 60) return `Last updated ${minutes} min ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Last updated ${hours} hr ago`

  const days = Math.floor(hours / 24)
  return `Last updated ${days} ${days === 1 ? 'day' : 'days'} ago`
}

function UpdatedAt({ createdAt }: { createdAt: string }) {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [createdAt])

  return <span data-testid="updated-at">{formatUpdatedAt(createdAt, now)}</span>
}

function formatRecord(record: HistoryRecord): string {
  return `${record.from} ${formatMoney(parseAmount(record.amount))} → ${record.to} ${record.result}`
}

function HistoryRow({ record, selected }: { record: HistoryRecord; selected: boolean }) {
  const rowRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    const row = rowRef.current
    const container = row?.parentElement?.parentElement
    if (!selected || !row || !container) return
    const bounds = container.getBoundingClientRect()
    const rowBounds = row.getBoundingClientRect()
    if (rowBounds.top < bounds.top) container.scrollTop += rowBounds.top - bounds.top
    else if (rowBounds.bottom > bounds.bottom)
      container.scrollTop += rowBounds.bottom - bounds.bottom
  }, [selected])
  const label = formatRecord(record)
  return (
    <li
      ref={rowRef}
      id={`history-${record.id}`}
      role="option"
      data-testid="history-item"
      aria-selected={selected}
      className={styles.historyRow}
    >
      {label}
    </li>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('exchange')
  const [amount, setAmount] = useState('0')
  const [{ from, to }, setPair] = useState({ from: 'EUR', to: 'USD' })
  const [currencies, setCurrencies] = useState<string[]>([])
  const [ratesError, setRatesError] = useState<string | null>(null)
  const [ratesRefresh, setRatesRefresh] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [{ records: history, selectedId }, dispatchHistory] = useReducer(
    historyReducer,
    initialHistoryState,
  )

  useEffect(() => {
    const controller = new AbortController()
    setRatesError(null)
    getCurrencies(controller.signal)
      .then((available) => {
        if (controller.signal.aborted) return
        setCurrencies(available)
        setPair((current) => {
          const nextFrom = available.includes(current.from) ? current.from : available[0]
          const nextTo = available.includes(current.to)
            ? current.to
            : (available.find((currency) => currency !== nextFrom) ?? available[0])
          return { from: nextFrom, to: nextTo }
        })
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setRatesError(error instanceof Error ? error.message : 'Unable to load currencies.')
        }
      })
    return () => controller.abort()
  }, [ratesRefresh])

  const ready = currencies.includes(from) && currencies.includes(to) && !ratesError
  const unavailableCurrencies = [...new Set([from, to])].filter(
    (currency) => !currencies.includes(currency),
  )
  const { quote, result, loading, error } = useQuote(amount, from, to, refresh, ready)
  const canSave = result !== null && !loading && !error

  function handleKeyPress(action: KeypadAction) {
    switch (action.type) {
      case 'digit':
      case 'decimal':
        if (tab === 'exchange') setAmount((current) => editAmount(current, action))
        break
      case 'backspace':
      case 'clear':
        if (tab === 'exchange') {
          setAmount((current) => editAmount(current, action))
        } else {
          dispatchHistory({ type: action.type === 'backspace' ? 'delete' : 'clear' })
        }
        break
      case 'save':
        if (tab === 'exchange' && canSave && result !== null) {
          dispatchHistory({
            type: 'save',
            record: { id: crypto.randomUUID(), from, to, amount, result },
          })
        }
        break
      case 'move':
        if (tab === 'history') dispatchHistory(action)
        break
      case 'restore': {
        const record =
          tab === 'history' ? history.find((entry) => entry.id === selectedId) : undefined
        if (record) {
          setPair({ from: record.from, to: record.to })
          setAmount(record.amount)
          setTab('exchange')
        }
        break
      }
      default:
        break
    }
  }

  return (
    <div className={styles.app}>
      <nav className={styles.header} aria-label="Calculator views">
        <button
          type="button"
          data-testid="tab-exchange"
          onClick={() => setTab('exchange')}
          aria-pressed={tab === 'exchange'}
        >
          Exchange Rate
        </button>
        <span className={styles.divider} aria-hidden="true">
          |
        </span>
        <button
          type="button"
          data-testid="tab-history"
          onClick={() => setTab('history')}
          aria-pressed={tab === 'history'}
        >
          History
        </button>
      </nav>

      {tab === 'exchange' && (
        <section className={`${styles.panel} ${styles.exchangePanel}`} aria-label="Exchange rate">
          <div className={styles.exchangeFields}>
            <div className={styles.currencyRow}>
              <select
                aria-label="From currency"
                className={styles.currencySelect}
                disabled={currencies.length === 0}
                data-testid="from-currency"
                value={from}
                onChange={(e) => {
                  const value = e.target.value
                  setPair((current) => ({ ...current, from: value }))
                }}
              >
                {!currencies.includes(from) && (
                  <option value={from} disabled>
                    {from}
                  </option>
                )}
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span aria-hidden="true">&gt;</span>
              <span
                data-testid="amount"
                aria-label="Entered amount"
                tabIndex={0}
                className={`${styles.amount} text-primary`}
              >
                {amount}
              </span>
            </div>
            <div className={styles.currencyRow}>
              <select
                className={styles.currencySelect}
                aria-label="To currency"
                disabled={currencies.length === 0}
                data-testid="to-currency"
                value={to}
                onChange={(e) => {
                  const value = e.target.value
                  setPair((current) => ({ ...current, to: value }))
                }}
              >
                {!currencies.includes(to) && (
                  <option value={to} disabled>
                    {to}
                  </option>
                )}
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span aria-hidden="true">&gt;</span>
              <span
                data-testid="result"
                aria-label="Converted amount"
                aria-live="polite"
                tabIndex={0}
                className={styles.amount}
              >
                {result ?? (loading ? 'Loading…' : '—')}
              </span>
            </div>
          </div>
          {amount.replace('.', '').length >= 12 && (
            <p role="status" className={styles.inputHint}>
              Maximum 12 digits
            </p>
          )}
          {ratesError && (
            <div role="alert">
              {ratesError}
              <button type="button" onClick={() => setRatesRefresh((r) => r + 1)}>
                Retry currencies
              </button>
            </div>
          )}
          {!ratesError && currencies.length > 0 && unavailableCurrencies.length > 0 && (
            <p role="alert">
              Unavailable currencies: {unavailableCurrencies.join(', ')}. Choose available
              currencies to continue.
            </p>
          )}
          {error && <p role="alert">{error} Use refresh to retry.</p>}
          <div className={styles.panelFooter}>
            {loading ? <span>Loading…</span> : quote && <UpdatedAt createdAt={quote.createdAt} />}
            <button
              type="button"
              aria-label="Refresh exchange rate"
              data-testid="refresh"
              onClick={() => setRefresh((r) => r + 1)}
            >
              ⟳
            </button>
          </div>
        </section>
      )}

      {tab === 'history' && (
        <section
          className={`${styles.panel} ${styles.historyPanel}`}
          aria-label="Conversion history"
        >
          <div className={styles.historyRows}>
            <ul
              role="listbox"
              aria-label="Saved conversions"
              tabIndex={0}
              aria-activedescendant={selectedId ? `history-${selectedId}` : undefined}
              onKeyDown={(event) => {
                if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                  event.preventDefault()
                  dispatchHistory({ type: 'move', direction: event.key === 'ArrowUp' ? -1 : 1 })
                }
              }}
            >
              {history.map((record) => (
                <HistoryRow key={record.id} record={record} selected={record.id === selectedId} />
              ))}
            </ul>
          </div>
          <div className={styles.panelFooter}>
            <p data-testid="history-count" aria-live="polite">
              {history.length} records
            </p>
          </div>
        </section>
      )}

      <Keypad tab={tab} onKeyPress={handleKeyPress} canSave={canSave} />
    </div>
  )
}
