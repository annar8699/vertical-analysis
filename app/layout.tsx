import type { Metadata } from 'next'
import { Montserrat, Inter } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Vertical Analysis | Maira',
  description: 'Keyword search volume trend analysis',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${montserrat.variable} ${inter.variable} font-sans`}
        style={{ fontFamily: 'var(--font-inter), sans-serif' }}
      >
        {children}
      </body>
    </html>
  )
}
