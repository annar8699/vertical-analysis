import type { TrendDirection } from '@/lib/trendAnalysis'

const CONFIG: Record<TrendDirection, { label: string; classes: string }> = {
  growing: { label: 'Growing', classes: 'bg-green-100 text-green-800' },
  stable: { label: 'Stable', classes: 'bg-orange-100 text-orange-800' },
  declining: { label: 'Declining', classes: 'bg-red-100 text-red-800' },
}

export function TrendBadge({ trend }: { trend: TrendDirection }) {
  const { label, classes } = CONFIG[trend]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${classes}`}>
      {label}
    </span>
  )
}
