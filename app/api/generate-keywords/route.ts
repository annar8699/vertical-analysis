import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

export const maxDuration = 30

function buildPrompt(url: string, description: string, seeds: string): string {
  return `You are a PPC keyword research specialist. Generate a list of ~50–80 relevant search keywords.

Context:
- Website/domain: ${url.trim() || 'not provided'}
- Business description: ${description.trim() || 'not provided'}
- Seed keywords: ${seeds.trim() || 'not provided'}

Rules:
- One keyword per line, no numbering, no bullets, no extra text
- Mix of broad and long-tail keywords
- Commercial and informational search intent
- Language: match seed keyword language, default to English
- No duplicates
- Return ONLY the keywords, nothing else`
}

export async function POST(req: Request) {
  if (!process.env.GOOGLE_AI_API_KEY) {
    return NextResponse.json(
      { error: 'AI keyword generation is not configured. Add GOOGLE_AI_API_KEY to environment variables.' },
      { status: 400 }
    )
  }

  try {
    const { url = '', description = '', seeds = '' } = await req.json()

    if (!url.trim() && !description.trim() && !seeds.trim()) {
      return NextResponse.json(
        { error: 'Please provide at least one input: URL, description, or seed keywords.' },
        { status: 400 }
      )
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const result = await model.generateContent(buildPrompt(url, description, seeds))
    const text = result.response.text()

    const keywords = text
      .split('\n')
      .map((k: string) => k.replace(/^[-•*\d.]+\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 100)

    return NextResponse.json({ keywords })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to generate keywords: ${message}` }, { status: 500 })
  }
}
