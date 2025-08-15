// netlify/functions/render.js
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.handler = async (event) => {
  try {
    if (!OPENAI_API_KEY) {
      return json(500, { error: "Missing OPENAI_API_KEY" });
    }

    // --- optional debug mode ---
    // Call: /.netlify/functions/render?debug=1
    // Shows which key Netlify is using (last 4) and OpenAI's response for gpt-image-1
    const url = new URL(event.rawUrl || `https://${event.headers.host}${event.path}`);
    if (url.searchParams.get("debug") === "1") {
      const last4 = (OPENAI_API_KEY || "").slice(-4);
      const check = await fetch("https://api.openai.com/v1/models/gpt-image-1", {
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }
      });
      const dbg = await check.json();
      return json(check.status, { debug: true, usingKeyEndsWith: last4, openAIResponse: dbg });
    }

    // --- normal render flow ---
    const body = safeJSON(event.body);
    const prompt = (body.prompt || "").trim();
    if (!prompt) return json(400, { error: "Missing prompt" });

    const n = clamp(body.n ?? 4, 3, 4);       // 3–4 previews
    const size = "1024x1024";                 // lock to valid size

    const imgRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size,
        n
      })
    });

    const imgData = await imgRes.json();

    // Friendly handling for common errors
    if (!imgRes.ok) {
      // Rate limit message
      if (imgRes.status === 429 || getCode(imgData) === "rate_limit_exceeded") {
        return json(429, {
          error: "rate_limited",
          message: "Too many requests. Please wait ~60 seconds and try again."
        });
      }

      // Org/verification message bubbles up clearly
      return json(imgRes.status, { error: imgData?.error || imgData || "OpenAI error" });
    }

    const pngs = (imgData.data || []).map(d => `data:image/png;base64,${d.b64_json}`);
    return json(200, { pngs });

  } catch (err) {
    return json(500, { error: String(err) });
  }
};

// ---------- helpers ----------
function json(status, obj) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj)
  };
}

function safeJSON(raw) {
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

function clamp(v, min, max) {
  return Math.min(Math.max(Number(v), min), max);
}

function getCode(data) {
  try { return data.error && (data.error.code || data.error?.error?.code); } catch { return null; }
}
