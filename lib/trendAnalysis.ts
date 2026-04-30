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

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatMonthLabel(year: number, month: number): string {
  return `${MONTH_LABELS[month - 1]} ${String(year).slice(2)}`
}

export function calcAvg(data: MonthlyVolume[]): number {
  if (data.length === 0) return 0
  return Math.round(data.reduce((sum, d) => sum + d.volume, 0) / data.length)
}

export function calculateTrend(data: MonthlyVolume[]): TrendDirection {
  if (data.length < 24) return 'stable'

  const sorted = [...data].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  )

  const last12 = sorted.slice(-12)
  const prev12 = sorted.slice(-24, -12)

  const avgLast = last12.reduce((s, d) => s + d.volume, 0) / 12
  const avgPrev = prev12.reduce((s, d) => s + d.volume, 0) / 12

  if (avgPrev === 0) return 'stable'

  const yoy = (avgLast - avgPrev) / avgPrev

  if (yoy > 0.05) return 'growing'
  if (yoy < -0.05) return 'declining'
  return 'stable'
}
