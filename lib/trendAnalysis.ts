export type TrendDirection = 'growing' | 'stable' | 'declining'

export interface MonthlyVolume {
  year: number
  month: number
  volume: number
  label: string
}

export interface KeywordResult {
  keyword: string
  monthlyData: MonthlyVolume[]
  avgVolume: number
  trend: TrendDirection
}

const MONTH_LABELS = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro']

export function formatMonthLabel(year: number, month: number): string {
  return `${MONTH_LABELS[month - 1]} ${String(year).slice(2)}`
}

export function calcAvg(data: MonthlyVolume[]): number {
  if (data.length === 0) return 0
  return Math.round(data.reduce((sum, d) => sum + d.volume, 0) / data.length)
}

export function calculateTrend(data: MonthlyVolume[]): TrendDirection {
  if (data.length < 3) return 'stable'

  const n = data.length
  const xMean = (n - 1) / 2
  const yMean = data.reduce((sum, d) => sum + d.volume, 0) / n

  if (yMean === 0) return 'stable'

  let numerator = 0
  let denominator = 0

  data.forEach((d, i) => {
    numerator += (i - xMean) * (d.volume - yMean)
    denominator += Math.pow(i - xMean, 2)
  })

  const slope = denominator !== 0 ? numerator / denominator : 0
  const slopePercent = (slope / yMean) * 100

  if (slopePercent > 3) return 'growing'
  if (slopePercent < -3) return 'declining'
  return 'stable'
}
