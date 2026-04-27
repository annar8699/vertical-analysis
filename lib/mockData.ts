import { MonthlyVolume, KeywordResult, formatMonthLabel, calculateTrend, calcAvg } from './trendAnalysis'

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function generateMonthlyData(
  keyword: string,
  months: number,
  direction: 'up' | 'down' | 'flat'
): MonthlyVolume[] {
  const hash = hashString(keyword)
  const baseVolume = 500 + (hash % 9500)
  const trendFactor = direction === 'up' ? 0.05 : direction === 'down' ? -0.04 : 0

  const now = new Date()
  const result: MonthlyVolume[] = []

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = date.getFullYear()
    const month = date.getMonth() + 1

    // Seasonal sine wave + trend + noise
    const seasonal = Math.sin(((month - 3) * Math.PI) / 6) * 0.25
    const trendMultiplier = 1 + trendFactor * (months - i - 1)
    const noise = (((hash * (i + 7)) % 300) / 1000) - 0.15

    const volume = Math.max(0, Math.round(baseVolume * (1 + seasonal + noise) * trendMultiplier))

    result.push({ year, month, volume, label: formatMonthLabel(year, month) })
  }

  return result
}

export function generateMockResults(keywords: string[], months: number): KeywordResult[] {
  const directions: Array<'up' | 'down' | 'flat'> = ['up', 'down', 'flat']

  return keywords.map((keyword, index) => {
    const hash = hashString(keyword)
    const direction = directions[(hash + index) % 3]
    const monthlyData = generateMonthlyData(keyword, months, direction)
    return {
      keyword,
      monthlyData,
      avgVolume: calcAvg(monthlyData),
      trend: calculateTrend(monthlyData),
    }
  })
}
