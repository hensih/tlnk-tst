export function parseAmount(value: string): number {
  return parseFloat(value)
}

export function convert(amount: number, rate: string): number {
  return amount * parseFloat(rate)
}

export function formatMoney(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}
