'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { KeywordResult } from '@/lib/trendAnalysis'
import { formatMonthLabel } from '@/lib/trendAnalysis'

export function TotalTrendChart({ data }: { data: KeywordResult[] }) {
  const chartData = useMemo(() => {
    const monthMap: Record<string, { year: number; month: number; total: number }> = {}

    for (const r of data) {
      for (const m of r.monthlyData) {
        const key = `${m.year}-${String(m.month).padStart(2, '0')}`
        if (!monthMap[key]) monthMap[key] = { year: m.year, month: m.month, total: 0 }
        monthMap[key].total += m.volume
      }
    }

    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        label: formatMonthLabel(v.year, v.month),
        total: v.total,
      }))
  }, [data])

  if (chartData.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#e8502a" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#e8502a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'var(--font-montserrat)' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'var(--font-montserrat)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            v >= 1000000
              ? `${(v / 1000000).toFixed(1)}M`
              : v >= 1000
              ? `${(v / 1000).toFixed(0)}k`
              : String(v)
          }
          width={48}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            fontSize: '12px',
            fontFamily: 'var(--font-montserrat)',
          }}
          formatter={(value: number) => [value.toLocaleString('en'), 'Total searches']}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#e8502a"
          strokeWidth={2.5}
          fill="url(#totalGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#e8502a' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
