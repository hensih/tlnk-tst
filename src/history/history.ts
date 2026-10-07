export interface HistoryRecord {
  id: string
  from: string
  to: string
  amount: string
  result: string
}

export const initialHistory: HistoryRecord[] = [
  { id: 'seed-1', from: 'USD', to: 'EUR', amount: '1000', result: '922.25' },
  { id: 'seed-2', from: 'EUR', to: 'USD', amount: '500', result: '542.15' },
  { id: 'seed-3', from: 'GBP', to: 'PLN', amount: '250', result: '1,271.72' },
  { id: 'seed-4', from: 'PLN', to: 'EUR', amount: '12500', result: '2,921.18' },
  { id: 'seed-5', from: 'SEK', to: 'GBP', amount: '3400', result: '254.49' },
  { id: 'seed-6', from: 'EUR', to: 'JPY', amount: '75', result: '12,185.25' },
  { id: 'seed-7', from: 'USD', to: 'SEK', amount: '2750', result: '28,503.07' },
]

export interface HistoryState {
  records: HistoryRecord[]
  selectedId: string | null
}

export type HistoryAction =
  | { type: 'save'; record: HistoryRecord }
  | { type: 'delete' }
  | { type: 'clear' }
  | { type: 'move'; direction: -1 | 1 }

export const initialHistoryState: HistoryState = {
  records: initialHistory,
  selectedId: initialHistory[0]?.id ?? null,
}

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'save':
      return {
        records: [...state.records, action.record],
        selectedId: state.selectedId ?? action.record.id,
      }
    case 'clear':
      return { records: [], selectedId: null }
    case 'delete': {
      const index = state.records.findIndex((record) => record.id === state.selectedId)
      if (index === -1) return state
      const records = state.records.filter((record) => record.id !== state.selectedId)
      return {
        records,
        selectedId: records[Math.min(index, records.length - 1)]?.id ?? null,
      }
    }
    case 'move': {
      if (state.records.length === 0) return state
      const index = state.records.findIndex((record) => record.id === state.selectedId)
      const next = Math.max(0, Math.min(state.records.length - 1, index + action.direction))
      return { ...state, selectedId: state.records[next].id }
    }
  }
}
