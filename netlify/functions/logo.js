// Netlify Function: /.netlify/functions/logo
// Uses OpenAI Images (gpt-image-1). Requires env var: OPENAI_API_KEY

export default async (req) => {
  /* ---- PROBE: allow GET so we can verify the env var is available ---- */
  if (req.method === 'GET') {
    return Response.json(
      {
        ok: true,
        method: 'GET',
        hasKey: !!process.env.OPENAI_API_KEY,
        keyPrefix: process.env.OPENAI_API_KEY
          ? process.env.OPENAI_API_KEY.slice(0, 7)
          : null
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  /* ---- Normal endpoint expects POST ---- */
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Parse body
  let body = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const prompt = body?.prompt || '';
  const size   = body?.size || '1024x1024';
  const count  = Math.min(Number(body?.count || 4), 6);

  if (!prompt) {
    return Response.json({ error: 'Missing prompt' }, { status: 400 });
  }

  try {
    // Call OpenAI Images
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    console.log('Using key prefix:', process.env.OPENAI_API_KEY?.slice(0, 7));

    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        n: count,
        size
      }),
      signal: controller.signal
    }).catch(() => {
      throw new Error('network');
    });

    clearTimeout(timeout);

    if (!r || !r.ok) {
      const code = r?.status || 502;
      const detail = r ? await r.text() : 'no response';
      console.log('OpenAI error:', code, detail);
      return Response.json({ error: 'provider_error', status: code, detail }, { status: 502 });
    }

    const data = await r.json();

    // Normalize to { images: [{url}] }
    const images = (data?.data || [])
      .map(x => x?.url
        ? { url: x.url }
        : x?.b64_json
          ? { url: `data:image/png;base64,${x.b64_json}` }
          : null)
      .filter(Boolean);

    if (!images.length) {
      return Response.json({ error: 'No images returned' }, { status: 502 });
    }

    return Response.json(
      { images },
      { headers: { 'Cache-Control': 'no-store' } }
    );

  } catch (e) {
    return Response.json({ error: 'function_exception', detail: String(e?.message || e) }, { status: 502 });
  }
};
