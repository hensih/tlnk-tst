import type { KeypadAction } from './input'
import styles from './Keypad.module.css'

interface KeypadProps {
  tab: 'exchange' | 'history'
  canSave: boolean
  onKeyPress: (action: KeypadAction) => void
}

interface KeypadButton {
  label: string
  action: KeypadAction
  testId: string
  historyOnly?: boolean
}

const ROWS: (KeypadButton | null)[][] = [
  [
    { label: 'C', action: { type: 'clear' }, testId: 'key-clear' },
    { label: '⌫', action: { type: 'backspace' }, testId: 'key-backspace' },
    { label: 'm', action: { type: 'save' }, testId: 'key-save' },
    null,
  ],
  [
    { label: '7', action: { type: 'digit', value: '7' }, testId: 'key-7' },
    { label: '8', action: { type: 'digit', value: '8' }, testId: 'key-8' },
    { label: '9', action: { type: 'digit', value: '9' }, testId: 'key-9' },
    { label: '▲', action: { type: 'move', direction: -1 }, testId: 'key-up', historyOnly: true },
  ],
  [
    { label: '4', action: { type: 'digit', value: '4' }, testId: 'key-4' },
    { label: '5', action: { type: 'digit', value: '5' }, testId: 'key-5' },
    { label: '6', action: { type: 'digit', value: '6' }, testId: 'key-6' },
    { label: '▼', action: { type: 'move', direction: 1 }, testId: 'key-down', historyOnly: true },
  ],
  [
    { label: '1', action: { type: 'digit', value: '1' }, testId: 'key-1' },
    { label: '2', action: { type: 'digit', value: '2' }, testId: 'key-2' },
    { label: '3', action: { type: 'digit', value: '3' }, testId: 'key-3' },
    { label: 'OK', action: { type: 'restore' }, testId: 'key-ok', historyOnly: true },
  ],
  [
    { label: '00', action: { type: 'digit', value: '00' }, testId: 'key-00' },
    { label: '0', action: { type: 'digit', value: '0' }, testId: 'key-0' },
    { label: '.', action: { type: 'decimal' }, testId: 'key-dot' },
    null,
  ],
]

export default function Keypad({ tab, onKeyPress, canSave }: KeypadProps) {
  return (
    <div className={styles.keypad}>
      {ROWS.flatMap((row, rowIndex) =>
        row.map((button, columnIndex) => {
          const key = `${rowIndex}-${columnIndex}`
          if (!button || (button.historyOnly && tab !== 'history')) {
            return <span key={key} aria-hidden="true" />
          }
          const disabled =
            (tab === 'history' && ['digit', 'decimal', 'save'].includes(button.action.type)) ||
            (button.action.type === 'save' && !canSave)
          return (
            <button
              key={key}
              type="button"
              data-testid={button.testId}
              aria-label={
                button.action.type === 'clear'
                  ? tab === 'history'
                    ? 'Clear history'
                    : 'Clear amount'
                  : button.action.type === 'backspace'
                    ? tab === 'history'
                      ? 'Delete selected conversion'
                      : 'Delete last digit'
                    : button.action.type === 'save'
                      ? 'Save conversion'
                      : button.action.type === 'move'
                        ? button.action.direction === -1
                          ? 'Previous conversion'
                          : 'Next conversion'
                        : button.action.type === 'restore'
                          ? 'Restore selected conversion'
                          : button.action.type === 'decimal'
                            ? 'Decimal point'
                            : button.label
              }
              disabled={disabled}
              onClick={() => onKeyPress(button.action)}
              className={`${styles.keypadButton}${button.action.type === 'clear' ? ' text-secondary' : ''}`}
            >
              {button.label}
            </button>
          )
        }),
      )}
    </div>
  )
}
