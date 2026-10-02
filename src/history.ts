export interface HistoryRecord {
  from: string
  to: string
  amount: string
  result: string
}

export const initialHistory: HistoryRecord[] = [
  { from: 'USD', to: 'EUR', amount: '1,000', result: '922.25' },
  { from: 'EUR', to: 'USD', amount: '500', result: '542.15' },
  { from: 'GBP', to: 'PLN', amount: '250', result: '1,271.72' },
  { from: 'PLN', to: 'EUR', amount: '12,500', result: '2,921.18' },
  { from: 'SEK', to: 'GBP', amount: '3,400', result: '254.49' },
  { from: 'EUR', to: 'JPY', amount: '75', result: '12,185.25' },
  { from: 'USD', to: 'SEK', amount: '2,750', result: '28,503.07' },
]
