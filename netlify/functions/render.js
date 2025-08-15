// netlify/functions/render.js
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.handler = async (event) => {
  try {
    if (!OPENAI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const prompt = (body.prompt || "").trim();
    const size = body.size || 1024;       // PNG size
    const n = body.n || 4;                 // 3–4 previews (we’ll keep 4)
    const preview = body.preview !== false; // default true

    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing prompt" }) };
    }

    // PNG previews via OpenAI image generation
    const imgRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-image-1",   // use your enabled image model
        prompt,
        size: `${size}x${size}`,
        n
      })
    });

    const imgData = await imgRes.json();
    if (!imgRes.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: imgData }) };
    }

    const pngs = (imgData.data || []).map(d => `data:image/png;base64,${d.b64_json}`);

    // No SVG for previews per your spec
    return { statusCode: 200, body: JSON.stringify({ pngs }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
