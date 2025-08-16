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
    // ---- OpenAI Images call ----
console.log("Final prompt:", finalPrompt);

const imgRes = await fetch("https://api.openai.com/v1/images/generations", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "gpt-image-1",
    prompt: finalPrompt,
    size,   // e.g. "1024x1024"
    n       // 1–3
  })
});

let imgData;
try {
  imgData = await imgRes.json();
} catch (e) {
  console.error("Image JSON parse error:", e);
  return resp(500, { error: "Could not parse image response" });
}

if (!imgRes.ok) {
  const msg = imgData?.error?.message || JSON.stringify(imgData).slice(0, 800);
  console.error("OpenAI image error:", msg);
  return resp(500, { error: msg });
}

// Prefer URLs; fall back to base64 if provided
const pngs = (imgData?.data || [])
  .map(d => d?.url || (d?.b64_json ? `data:image/png;base64,${d.b64_json}` : null))
  .filter(Boolean);

if (!pngs.length) {
  console.error("No image URLs/base64 returned:", imgData);
  return resp(500, { error: "No images returned by OpenAI" });
}

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
