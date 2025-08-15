// netlify/functions/render.js
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.handler = async (event) => {
  try {
    if (!OPENAI_API_KEY) {
      return resp(500, { error: "Missing OPENAI_API_KEY" });
    }

    // Parse body (POST) or query (GET test)
    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }

    const prompt = String(body.prompt || "").trim();
    if (!prompt) return resp(400, { error: "Missing prompt" });

    // Accept only allowed sizes and default to 1024x1024
    const allowed = new Set(["1024x1024", "1024x1536", "1536x1024", "auto"]);
    const size = allowed.has(String(body.size)) ? String(body.size) : "1024x1024";

    // HARD CAP to 3 images to avoid Netlify response-size limits
    const n = Math.min(Number(body.n || 3), 3);

    // Call OpenAI Images
    const imgRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size,
        n,
        response_format: "b64_json"
      })
    });

    const imgData = await imgRes.json();
    if (!imgRes.ok) {
      // Bubble up the real error to the UI
      return resp(500, { error: imgData });
    }

    const pngs = (imgData.data || []).map(d => `data:image/png;base64,${d.b64_json}`);
    return resp(200, { pngs });

  } catch (e) {
    return resp(500, { error: String(e) });
  }
};

// helper
function resp(status, obj) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj)
  };
}
