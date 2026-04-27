'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { KeywordResult } from '@/lib/trendAnalysis'

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#65a30d', '#db2777']

export function VerticalChart({ data }: { data: KeywordResult[] }) {
  if (data.length === 0) return null

  const chartData = data[0].monthlyData.map((m, i) => {
    const point: Record<string, string | number> = { label: m.label }
    data.forEach((r) => {
      point[r.keyword] = r.monthlyData[i]?.volume ?? 0
    })
    return point
  })

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
          width={40}
        />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          formatter={(value: number, name: string) => [value.toLocaleString('cs'), name]}
        />
        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} />
        {data.map((r, i) => (
          <Line
            key={r.keyword}
            type="monotone"
            dataKey={r.keyword}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
