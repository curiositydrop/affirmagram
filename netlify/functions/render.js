// netlify/functions/render.js
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.handler = async (event) => {
  try {
    if (!OPENAI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const prompt = (body.prompt || "").trim();

    // --- size handling (API now requires specific strings) ---
    // Accept "1024", 1024, or full strings like "1024x1024"
    let requested = body.size ?? "1024x1024";
    requested = String(requested);
    if (/^\d+$/.test(requested)) requested = `${requested}x${requested}`;

    const allowed = new Set(["1024x1024", "1024x1536", "1536x1024", "auto"]);
    const size = allowed.has(requested) ? requested : "1024x1024";

    // # of images (keep between 3–4)
    const n = Math.min(Math.max(body.n || 4, 3), 4);

    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing prompt" }) };
    }

    // Call OpenAI images API
    const imgRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size,   // must be one of: 1024x1024, 1024x1536, 1536x1024, auto
        n
      })
    });

    const imgData = await imgRes.json();
    if (!imgRes.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: imgData }) };
    }

    const pngs = (imgData.data || []).map(d => `data:image/png;base64,${d.b64_json}`);
    return { statusCode: 200, body: JSON.stringify({ pngs }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
