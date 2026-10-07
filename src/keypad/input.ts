export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '00'

export type AmountAction =
  { type: 'digit'; value: Digit } | { type: 'decimal' } | { type: 'backspace' } | { type: 'clear' }

export type KeypadAction =
  AmountAction | { type: 'save' } | { type: 'move'; direction: -1 | 1 } | { type: 'restore' }

export function editAmount(current: string, action: AmountAction): string {
  switch (action.type) {
    case 'digit': {
      const next =
        current === '0' ? (action.value === '00' ? '0' : action.value) : current + action.value
      // Bound input to 12 digits, including fractional digits, while preserving editing precision.
      return next.replace('.', '').length <= 12 ? next : current
    }
    case 'decimal':
      return current.includes('.') ? current : `${current}.`
    case 'backspace':
      return current.length > 1 ? current.slice(0, -1) : '0'
    case 'clear':
      return '0'
  }
}
