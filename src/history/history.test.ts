import { describe, expect, it } from 'vitest'
import { historyReducer, initialHistoryState, type HistoryState } from './history'
import { parseAmount } from '../shared/money'

describe('history', () => {
  it('restores seeded amounts without thousands separators', () => {
    expect(initialHistoryState.records.map((record) => parseAmount(record.amount))).toEqual([
      1000, 500, 250, 12500, 3400, 75, 2750,
    ])
    const ids = initialHistoryState.records.map((record) => record.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('preserves entered precision and selects the first record saved after clearing', () => {
    const empty = historyReducer(initialHistoryState, { type: 'clear' })
    const record = {
      id: 'new-record',
      from: 'EUR',
      to: 'USD',
      amount: '1234.56700',
      result: '1,338.6',
    }
    const saved = historyReducer(empty, { type: 'save', record })
    expect(saved.records[0].amount).toBe('1234.56700')
    expect(saved.selectedId).toBe(record.id)
  })

  it('keeps the current selection when appending another record', () => {
    const selected = historyReducer(initialHistoryState, { type: 'move', direction: 1 })
    const saved = historyReducer(selected, {
      type: 'save',
      record: { ...selected.records[0], id: 'new-record' },
    })
    expect(saved.selectedId).toBe(selected.selectedId)
  })

  it('deletes the selected record and selects its successor with stable IDs', () => {
    const selected = historyReducer(initialHistoryState, { type: 'move', direction: 1 })
    const deleted = historyReducer(selected, { type: 'delete' })
    expect(deleted.records.map((record) => record.id)).toEqual([
      'seed-1',
      'seed-3',
      'seed-4',
      'seed-5',
      'seed-6',
      'seed-7',
    ])
    expect(deleted.selectedId).toBe('seed-3')
    expect(deleted.records[1]).toBe(initialHistoryState.records[2])
  })

  it('selects the preceding record when deleting the last and clears selection when empty', () => {
    let state: HistoryState = {
      records: initialHistoryState.records.slice(0, 2),
      selectedId: 'seed-2',
    }
    state = historyReducer(state, { type: 'delete' })
    expect(state.selectedId).toBe('seed-1')
    state = historyReducer(state, { type: 'delete' })
    expect(state).toEqual({ records: [], selectedId: null })
    expect(historyReducer(state, { type: 'delete' })).toEqual(state)
    expect(historyReducer(state, { type: 'move', direction: 1 })).toEqual(state)
    expect(historyReducer(state, { type: 'move', direction: -1 })).toEqual(state)
  })

  it('stops navigation at the first and last records', () => {
    expect(historyReducer(initialHistoryState, { type: 'move', direction: -1 }).selectedId).toBe(
      'seed-1',
    )
    let state = initialHistoryState
    for (let i = 0; i < 10; i++) {
      state = historyReducer(state, { type: 'move', direction: 1 })
    }
    expect(state.selectedId).toBe('seed-7')
  })
})
