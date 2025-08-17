// Netlify Function: /.netlify/functions/logo
// Real generator using OpenAI Images. Requires env var: OPENAI_API_KEY

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body = {};
  try { body = await req.json(); } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 });
  }
  console.log('LogoLab prompt:', body?.prompt);
  
  const prompt = body?.prompt || '';
  const size   = body?.size || '1024x1024';
  const count  = Math.min(Number(body?.count || 4), 6);

  if (!prompt) {
    return Response.json({ error: 'Missing prompt' }, { status: 400 });
  }

  try {
    // 1) Call OpenAI Images
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s server timeout

    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        prompt,
        n: count,
        size
      }),
      signal: controller.signal
    }).catch((e) => {
      // network/timeout
      throw new Error('network');
    });

    clearTimeout(timeout);

    if (!r || !r.ok) {
      const code = r?.status || 502;
      return Response.json({ error: `provider ${code}` }, { status: 502 });
    }

    const data = await r.json();

    // 2) Normalize to { images: [{url}] }
    const images = (data?.data || []).map(x =>
      x?.url
        ? { url: x.url }
        : x?.b64_json
          ? { url: `data:image/png;base64,${x.b64_json}` }
          : null
    ).filter(Boolean);

    if (!images.length) {
      return Response.json({ error: 'No images returned' }, { status: 502 });
    }

    return Response.json(
      { images },
      { headers: { 'Cache-Control': 'no-store' } }
    );

  } catch (e) {
    // Safety net: translate any thrown error to a 502
    return Response.json({ error: 'Provider failed' }, { status: 502 });
  }
};
