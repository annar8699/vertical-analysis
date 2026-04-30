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

const COLORS = ['#FF4D30', '#2563eb', '#16a34a', '#9333ea', '#0891b2', '#65a30d', '#db2777', '#f59e0b']

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
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'var(--font-inter), sans-serif' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'var(--font-inter), sans-serif' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
          width={40}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            fontSize: '12px',
            fontFamily: 'var(--font-inter), sans-serif',
          }}
          formatter={(value: number, name: string) => [value.toLocaleString('en'), name]}
        />
        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px', fontFamily: 'var(--font-inter), sans-serif' }} />
        {data.map((r, i) => (
          <Line
            key={r.keyword}
            type="monotone"
            dataKey={r.keyword}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
