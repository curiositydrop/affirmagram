// netlify/functions/render.js
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.handler = async (event) => {
  // Handy debug probe: /.netlify/functions/render?debug=1
  if ((event.queryStringParameters || {}).debug === "1") {
    return {
      statusCode: 200,
      body: JSON.stringify({
        debug: true,
        usingKeyEndsWith: (OPENAI_API_KEY || "").slice(-4),
        model: "gpt-image-1"
      }),
    };
  }

  if (!OPENAI_API_KEY) {
    return json(500, { error: { message: "Missing OPENAI_API_KEY" } });
  }

  try {
    const body = safeJSON(event.body);
    const prompt = (body.prompt || "").trim();

    // Accept either "1024x1024" etc, or a number like 1024 (normalize to string)
    let size = body.size || "1024x1024";
    if (typeof size === "number") size = `${size}x${size}`;
    const allowed = new Set(["1024x1024", "1024x1536", "1536x1024", "auto"]);
    if (!allowed.has(size)) size = "1024x1024";

    const n = Number.isFinite(body.n) ? Math.max(1, Math.min(4, body.n)) : 4;

    if (!prompt) {
      return json(400, { error: { message: "Missing prompt" } });
    }

    const imgRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size,        // must be a string like "1024x1024"
        n            // 1–4
      })
    });

    // Try to parse JSON either way so we can surface detailed errors
    const rawText = await imgRes.text();
    let data;
    try { data = JSON.parse(rawText); } catch { data = rawText; }

    // Handle non-2xx with rich details (rate limits, verification, etc.)
    if (!imgRes.ok) {
      const retryAfter = imgRes.headers.get("retry-after");
      const requestId = imgRes.headers.get("x-request-id");
      const errPayload = (data && data.error) ? data.error : { message: String(data) };

      // Optional: soft guidance for 429s
      if (imgRes.status === 429) {
        errPayload.hint = retryAfter
          ? `Rate limited. Try again after ~${retryAfter}s.`
          : "Rate limited. Try again shortly.";
      }

      return json(imgRes.status, {
        error: {
          status: imgRes.status,
          message: errPayload.message || "Request failed",
          type: errPayload.type || null,
          param: errPayload.param || null,
          code: errPayload.code || null,
          request_id: requestId || null
        }
      });
    }

    // Success → turn b64 images into data URLs
    const pngs = Array.isArray(data?.data)
      ? data.data.map(d => `data:image/png;base64,${d.b64_json}`)
      : [];

    return json(200, { pngs });
  } catch (err) {
    return json(500, { error: { message: String(err) } });
  }
};

/* helpers */
function safeJSON(s) {
  if (!s) return {};
  try { return JSON.parse(s); } catch { return {}; }
}
function json(status, obj) {
  return { statusCode: status, body: JSON.stringify(obj) };
}
