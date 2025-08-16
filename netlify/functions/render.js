// netlify/functions/render.js
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.handler = async (event) => {
  try {
    if (!OPENAI_API_KEY) {
      return resp(500, { error: "Missing OPENAI_API_KEY" });
    }

    // Parse body
    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }

    const prompt = String(body.prompt || "").trim();
if (!prompt) return resp(400, { error: "Missing prompt" });

// Detect wordmark (if the upstream prompt says it)
const isWordmark = /wordmark|text[-\s]*only/i.test(prompt);

// Two premium clamps
const symbolClamp =
  "award-winning branding, clean vector logo, iconic silhouette, minimal geometric forms, grid-aligned, balanced symmetry, strong negative space, timeless design, professional polish, brand-ready, high contrast, flat color, no gradients, no text, no slogans, no mockups, no 3D, no bevel, no drop shadow, no circle-slash/prohibition, no emoji, centered composition on plain background";

const wordmarkClamp =
  "award-winning branding, typography-first text-only wordmark, refined custom lettering, optical kerning, consistent stroke weight, timeless design, professional polish, brand-ready, high contrast, flat color, no gradients, no icons, no shapes or enclosures, no mockups, no 3D, no bevel, no drop shadow, centered composition on plain background";

// Use the right clamp
const styleClamp  = isWordmark ? wordmarkClamp : symbolClamp;
const finalPrompt = `${prompt}, ${styleClamp}`;
    
    const allowed = new Set(["1024x1024", "1024x1536", "1536x1024", "auto"]);
    const size = allowed.has(String(body.size)) ? String(body.size) : "1024x1024";

    // HARD CAP to 3 images
    const n = Math.min(Number(body.n || 3), 3);

    // Call OpenAI Images — removed invalid response_format
    const imgRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
  model: "gpt-image-1",
  prompt: finalPrompt,
  size,
  n
})
    });

    const imgData = await imgRes.json();
    if (!imgRes.ok) {
      return resp(500, { error: imgData });
    }

    const pngs = (imgData.data || []).map(d => d.url || `data:image/png;base64,${d.b64_json}`);
    return resp(200, { pngs });

  } catch (e) {
    return resp(500, { error: String(e) });
  }
};

function resp(status, obj) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj)
  };
}
