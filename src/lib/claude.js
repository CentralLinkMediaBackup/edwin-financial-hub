// Claude API proxy client
// All requests go through /ai (Cloudflare Pages Function) — key never in frontend code.

export const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'
export const MAX_TOKENS = 1000

export async function callClaudeProxy(messages, systemPrompt, tools = []) {
  const body = {
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content })),
  }
  if (tools.length > 0) body.tools = tools

  const response = await fetch('/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(`CLAUDE_ERROR:${response.status}:${data?.error?.message || ''}`)
  }
  return data
}
