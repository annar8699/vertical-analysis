import type { TrendDirection } from '@/lib/trendAnalysis'

const CONFIG: Record<TrendDirection, { label: string; classes: string }> = {
  growing: { label: 'Rostoucí', classes: 'bg-green-100 text-green-700' },
  stable: { label: 'Stabilní', classes: 'bg-amber-100 text-amber-700' },
  declining: { label: 'Klesající', classes: 'bg-red-100 text-red-700' },
}

export function TrendBadge({ trend }: { trend: TrendDirection }) {
  const { label, classes } = CONFIG[trend]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  )
}
