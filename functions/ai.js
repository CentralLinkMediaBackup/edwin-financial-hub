// Cloudflare Pages Function — proxies Claude API calls.
// env.ANTHROPIC_API_KEY is a Cloudflare Pages secret, never in frontend code.

export async function onRequestPost(context) {
  const { request, env } = context

  if (!env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY secret not configured in Cloudflare Pages.' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const body = await request.json()

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    const data = await upstream.json()
    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: { message: err.message } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
