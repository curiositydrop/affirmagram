// netlify/functions/brief.js
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const PRO_STYLE_BASE =
  "flat vector logomark, minimal geometric construction, balanced negative space, consistent stroke weights, corner radii tuned for harmony, mark-only (no text), clean background";
const PRO_AVOIDS =
  "Avoid: gradients, 3D, bevels, gloss, shadows, skeuomorphism, photorealism, busy details, thin hairlines, default clip-art shapes, stock icon style, watermark, text";

function buildPrompts({ brand, vibe, colors, symbol }) {
  const palette = colors?.trim() || "a limited 1–2 color palette";
  const motif = symbol?.trim() || "an abstract symbol";
  const vibeWords = vibe?.trim() || "modern, clean";

  return [
    `${vibeWords} ${PRO_STYLE_BASE}, ${motif}, limited palette: ${palette}. ${PRO_AVOIDS}.`,
    `premium minimal ${PRO_STYLE_BASE}, ${motif} expressed with strong figure–ground and simple geometry, limited palette: ${palette}. ${PRO_AVOIDS}.`,
    `grid-built ${PRO_STYLE_BASE}, ${motif} using 2–3 primary shapes and a negative-space cut, compact proportions for small-size legibility, limited palette: ${palette}. ${PRO_AVOIDS}.`
  ];
}

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const brand  = (body.brand  || "").trim();
    const vibe   = (body.vibe   || "").trim();
    const colors = (body.colors || "").trim();
    const symbol = (body.symbol || "").trim();

    if (!brand) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing brand" }) };
    }

    // Cheap brief via small model — optional but nice.
    let brief = "";
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content:
                "You are a senior brand designer. Write a concise creative brief (80–120 words) for a MARK-ONLY logo (no text). Prefer simple geometry, strong negative space, and 1–2 colors."
            },
            {
              role: "user",
              content:
                `Brand: ${brand}\nVibe: ${vibe || "(designer's choice: modern, clean)"}\nColors: ${colors || "(designer's choice: limited palette)"}\nMotif: ${symbol || "(abstract)"}\nConstraints: flat vector, no gradients/3D/shadows/clip-art.`
            }
          ]
        })
      });
      const data = await res.json();
      if (res.ok) {
        brief = (data.choices?.[0]?.message?.content || "")
          .replace(/[#*_`>]/g, "") // strip markdown symbols to keep it tidy in UI
          .trim();
      }
    } catch (_) { /* swallow; we’ll use fallback */ }

    if (!brief) {
      // Fallback brief (no extra tokens)
      brief =
        `${brand} should feel ${vibe || "modern and clean"}. Use ${colors || "a limited 1–2 color palette"} and a simple, geometric mark—no text. ` +
        `Emphasize balanced negative space, clear silhouette, and consistent stroke weights. Explore ${symbol || "an abstract symbol"} in a flat vector style. ` +
        `The mark must scale well for favicons, social icons, packaging, and apparel. Avoid gradients, 3D, shadows, or clip-art looks.`;
    }

    const prompts = buildPrompts({ brand, vibe, colors, symbol });

    return {
      statusCode: 200,
      body: JSON.stringify({ brief, prompts })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
