import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import App from './App'

interface PendingRequest {
  url: string
  init?: RequestInit
  resolve: (response: Response) => void
  reject: (error: Error) => void
}

let requests: PendingRequest[]
let app: ReactTestRenderer

const element = (id: string) => app.root.findByProps({ 'data-testid': id })
const click = (id: string) => act(() => element(id).props.onClick())
const text = (id: string) => element(id).children.join('')

async function respond(request: PendingRequest, body: unknown, status = 200) {
  await act(async () => {
    request.resolve({ ok: status < 400, status, json: async () => body } as Response)
  })
}

async function loadCurrencies(currencies = ['USD', 'EUR', 'GBP']) {
  await respond(requests[0], { currencies })
}

async function quote(request = requests[requests.length - 1]) {
  const inputs = JSON.parse(request.init?.body as string)
  await respond(request, {
    ...inputs,
    rate: '2',
    quoteId: 'quote',
    createdAt: '2026-10-04T12:00:00Z',
    expiresAt: '2026-10-04T12:05:00Z',
  })
}

beforeEach(() => {
  requests = []
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (url: string, init?: RequestInit) =>
        new Promise<Response>((resolve, reject) => requests.push({ url, init, resolve, reject })),
    ),
  )
  act(() => {
    app = create(<App />)
  })
})

afterEach(() => {
  act(() => app.unmount())
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('exchange requests', () => {
  it('deletes exactly one selected conversion per backspace press and keeps the list rendered', () => {
    click('tab-history')
    click('key-down')
    click('key-backspace')
    expect(text('history-count')).toBe('6 records')
    const rows = app.root.findAllByProps({ 'data-testid': 'history-item' })
    expect(rows).toHaveLength(6)
    expect(rows.map((row) => row.props.id)).toEqual([
      'history-seed-1',
      'history-seed-3',
      'history-seed-4',
      'history-seed-5',
      'history-seed-6',
      'history-seed-7',
    ])
    expect(rows[1].props['aria-selected']).toBe(true)
    click('key-backspace')
    expect(text('history-count')).toBe('5 records')
    expect(app.root.findAllByProps({ 'data-testid': 'history-item' })).toHaveLength(5)
  })

  it('explains unavailable restored currencies and recovers when the user replaces them', async () => {
    await loadCurrencies()
    await quote()
    click('tab-history')
    click('key-down')
    click('key-down')
    click('key-ok')
    expect(element('from-currency').props.value).toBe('GBP')
    expect(element('to-currency').props.value).toBe('PLN')
    expect(element('to-currency').findByProps({ value: 'PLN', disabled: true }).children).toEqual([
      'PLN',
    ])
    expect(app.root.findByProps({ role: 'alert' }).children.join('')).toContain(
      'Unavailable currencies: PLN',
    )
    expect(element('key-save').props.disabled).toBe(true)
    click('key-save')
    click('refresh')
    expect(requests).toHaveLength(2)
    act(() => element('to-currency').props.onChange({ target: { value: 'USD' } }))
    expect(app.root.findAllByProps({ role: 'alert' })).toHaveLength(0)
    expect(requests).toHaveLength(3)
    await quote()
    expect(element('key-save').props.disabled).toBe(false)
  })

  it('initializes currencies using the latest restored pair without refetching the list', async () => {
    click('tab-history')
    click('key-down')
    click('key-down')
    click('key-ok')
    await loadCurrencies(['GBP', 'EUR', 'USD'])
    expect(element('from-currency').props.value).toBe('GBP')
    expect(element('to-currency').props.value).toBe('EUR')
    act(() => element('from-currency').props.onChange({ target: { value: 'USD' } }))
    expect(requests.filter((request) => request.url === '/api/rates')).toHaveLength(1)
  })

  it('keeps keypad selection visible without scrolling the page', () => {
    const container = { scrollTop: 0, getBoundingClientRect: () => ({ top: 0, bottom: 100 }) }
    act(() => {
      app.unmount()
      app = create(<App />, {
        createNodeMock: (node) =>
          node.type === 'li'
            ? {
                parentElement: { parentElement: container },
                getBoundingClientRect: () =>
                  node.props.id === 'history-seed-1'
                    ? { top: 0, bottom: 30 }
                    : { top: 120, bottom: 150 },
              }
            : null,
      })
    })
    click('tab-history')
    click('key-down')
    expect(container.scrollTop).toBe(50)
    expect(app.root.findByProps({ role: 'listbox' }).props['aria-activedescendant']).toBe(
      'history-seed-2',
    )
  })

  it('exposes view selection, named controls, and keyboard history navigation', () => {
    expect(element('from-currency').props['aria-label']).toBe('From currency')
    expect(element('refresh').props['aria-label']).toBe('Refresh exchange rate')
    expect(element('tab-exchange').props['aria-pressed']).toBe(true)
    click('tab-history')
    expect(element('tab-history').props['aria-pressed']).toBe(true)
    expect(element('key-backspace').props['aria-label']).toBe('Delete selected conversion')
    const preventDefault = vi.fn()
    act(() =>
      app.root
        .findByProps({ role: 'listbox' })
        .props.onKeyDown({ key: 'ArrowDown', preventDefault }),
    )
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(app.root.findAllByProps({ role: 'option' })[1].props['aria-selected']).toBe(true)
  })

  it('updates the relative timestamp each minute without requesting a new quote', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-04T12:02:00Z'))
    await loadCurrencies()
    await quote()
    expect(text('updated-at')).toBe('Last updated 2 min ago')

    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(text('updated-at')).toBe('Last updated 3 min ago')
    expect(requests).toHaveLength(2)

    act(() => app.unmount())
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reports malformed quote data without crashing and recovers on refresh', async () => {
    await loadCurrencies()
    await respond(requests[1], { from: 'EUR', to: 'USD', amount: 0, rate: '2' })
    expect(element('key-save').props.disabled).toBe(true)
    expect(app.root.findAllByProps({ 'data-testid': 'updated-at' })).toHaveLength(0)
    expect(app.root.findByProps({ role: 'alert' }).children.join('')).toContain(
      'response is invalid',
    )
    click('refresh')
    await quote()
    expect(element('key-save').props.disabled).toBe(false)
    expect(app.root.findAllByProps({ role: 'alert' })).toHaveLength(0)
  })

  it('routes typed keypad actions according to the active tab', async () => {
    await loadCurrencies()
    click('key-00')
    expect(text('amount')).toBe('0')
    click('key-1')
    click('key-dot')
    click('key-dot')
    click('key-00')
    expect(text('amount')).toBe('1.00')
    click('key-backspace')
    expect(text('amount')).toBe('1.0')
    click('tab-history')
    expect(element('key-1').props.disabled).toBe(true)
    expect(element('key-dot').props.disabled).toBe(true)
    expect(element('key-save').props.disabled).toBe(true)
    click('key-down')
    click('key-up')
    click('key-backspace')
    expect(text('history-count')).toBe('6 records')
    click('key-ok')
    expect(text('amount')).toBe('500')
    click('tab-history')
    click('key-clear')
    expect(text('history-count')).toBe('0 records')
    click('key-ok')
    expect(text('history-count')).toBe('0 records')
  })

  it('waits for currencies and preserves valid defaults regardless of API order', async () => {
    expect(requests).toHaveLength(1)
    expect(element('key-save').props.disabled).toBe(true)
    await loadCurrencies()
    expect(element('from-currency').props.value).toBe('EUR')
    expect(element('to-currency').props.value).toBe('USD')
    expect(JSON.parse(requests[1].init?.body as string)).toEqual({
      from: 'EUR',
      to: 'USD',
      amount: 0,
    })
  })

  it('chooses available fallback currencies, including a single currency', async () => {
    await loadCurrencies(['GBP'])
    expect(element('from-currency').props.value).toBe('GBP')
    expect(element('to-currency').props.value).toBe('GBP')
    expect(JSON.parse(requests[1].init?.body as string)).toEqual({
      from: 'GBP',
      to: 'GBP',
      amount: 0,
    })
  })

  it('uses distinct fallbacks when both defaults are unavailable', async () => {
    await loadCurrencies(['GBP', 'PLN'])
    expect(element('from-currency').props.value).toBe('GBP')
    expect(element('to-currency').props.value).toBe('PLN')
  })

  it('shows empty currency errors and supports retry', async () => {
    await loadCurrencies([])
    expect(requests).toHaveLength(1)
    expect(app.root.findByProps({ role: 'alert' }).children[0]).toBe(
      'No valid currencies are available.',
    )
    act(() =>
      app.root
        .findAllByType('button')
        .find((button) => button.children.includes('Retry currencies'))!
        .props.onClick(),
    )
    await respond(requests[1], { currencies: ['EUR', 'USD'] })
    expect(requests[2].url).toBe('/api/quote')
  })

  it('reports a rates network failure without requesting a quote', async () => {
    await act(async () => {
      requests[0].reject(new Error('Network unavailable'))
    })
    expect(app.root.findByProps({ role: 'alert' }).children[0]).toBe('Network unavailable')
    expect(requests).toHaveLength(1)
  })

  it('cancels stale requests and ignores late responses even when fetch ignores abort', async () => {
    await loadCurrencies()
    await quote()
    click('key-1')
    const older = requests[2]
    click('key-2')
    const newer = requests[3]
    expect(older.init?.signal?.aborted).toBe(true)
    expect(text('result')).toBe('Loading…')
    expect(element('key-save').props.disabled).toBe(true)
    await quote(newer)
    expect(text('result')).toBe('24')
    await quote(older)
    expect(text('result')).toBe('24')
    click('refresh')
    expect(text('result')).toBe('Loading…')
    expect(element('key-save').props.disabled).toBe(true)
  })

  it('hides results immediately when currencies change and rejects mismatched quotes', async () => {
    await loadCurrencies()
    await quote()
    act(() => element('to-currency').props.onChange({ target: { value: 'GBP' } }))
    expect(text('result')).toBe('Loading…')
    await respond(requests[2], { from: 'EUR', to: 'USD', amount: 0, rate: '2' })
    expect(text('result')).toBe('—')
    expect(element('key-save').props.disabled).toBe(true)
    expect(app.root.findByProps({ role: 'alert' }).children.join('')).toContain('does not match')
  })

  it('ends loading on quote failure and recovers through refresh', async () => {
    await loadCurrencies()
    await respond(requests[1], {}, 500)
    expect(text('result')).toBe('—')
    expect(app.root.findByProps({ role: 'alert' }).children.join('')).toContain(
      'Quote request failed: 500',
    )
    click('refresh')
    await quote()
    expect(text('result')).toBe('0')
    expect(element('key-save').props.disabled).toBe(false)
    expect(app.root.findAllByProps({ role: 'alert' })).toHaveLength(0)
  })

  it('ignores obsolete network errors and ends loading on a current network error', async () => {
    await loadCurrencies()
    const older = requests[1]
    click('key-1')
    await quote()
    await act(async () => {
      older.reject(new Error('Obsolete failure'))
    })
    expect(text('result')).toBe('2')
    expect(app.root.findAllByProps({ role: 'alert' })).toHaveLength(0)
    click('refresh')
    await act(async () => {
      requests[requests.length - 1].reject(new Error('Network unavailable'))
    })
    expect(text('result')).toBe('—')
    expect(element('key-save').props.disabled).toBe(true)
    expect(app.root.findByProps({ role: 'alert' }).children.join('')).toContain(
      'Network unavailable',
    )
  })

  it('guards save callbacks before a matching quote and restores raw history amounts', async () => {
    await loadCurrencies()
    click('key-save')
    click('tab-history')
    expect(text('history-count')).toBe('7 records')
    click('key-ok')
    expect(text('amount')).toBe('1000')
    expect(JSON.parse(requests[requests.length - 1].init?.body as string).amount).toBe(1000)
    click('key-clear')
    click('key-1')
    click('key-dot')
    click('key-2')
    click('key-3')
    click('key-4')
    await quote()
    click('key-save')
    click('tab-history')
    expect(text('history-count')).toBe('8 records')
    for (let i = 0; i < 7; i++) click('key-down')
    click('key-ok')
    expect(text('amount')).toBe('1.234')
    const pending = requests[requests.length - 1]
    act(() => app.unmount())
    expect(pending.init?.signal?.aborted).toBe(true)
  })
})
