// netlify/functions/render.js
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.handler = async (event) => {
  try {
    if (!OPENAI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: true, message: "Missing OPENAI_API_KEY" }) };
    }

    // optional quick sanity check: /.netlify/functions/render?debug=1
    const qs = event.queryStringParameters || {};
    if (qs.debug) {
      return { statusCode: 200, body: JSON.stringify({ debug: true, usingKeyEndsWith: OPENAI_API_KEY.slice(-4) }) };
    }

    const body   = JSON.parse(event.body || "{}");
    const prompt = (body.prompt || "").trim();
    const size   = body.size || "1024x1024"; // valid: 1024x1024, 1024x1536, 1536x1024, auto
    const n      = body.n || 4;

    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: true, message: "Missing prompt" }) };
    }

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size,
        n
      })
    });

    const data = await res.json();

    if (!res.ok) {
      const message =
        data?.error?.message ||
        data?.message ||
        "Image API error";
      return {
        statusCode: 500,
        body: JSON.stringify({ error: true, message, details: data })
      };
    }

    const pngs = (data.data || []).map(d => `data:image/png;base64,${d.b64_json}`);
    return { statusCode: 200, body: JSON.stringify({ pngs }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: true, message: String(err) }) };
  }
};
