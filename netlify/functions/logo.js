// Netlify Function: /.netlify/functions/logo
// Mock version: always returns placeholder images so your UI never breaks.

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body = {};
  try { body = await req.json(); } catch {}

  const count = Math.min(Number(body?.count || 4), 6);

  const images = Array.from({ length: count }).map((_, i) => ({
    url: `https://picsum.photos/seed/mbg${i}/1024/1024`
  }));

  return Response.json(
    { images },
    { headers: { 'Cache-Control': 'no-store' } }
  );
};
