// netlify/functions/brief.js
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.handler = async (event) => {
  try {
    if (!OPENAI_API_KEY) {
      return json(500, { error: "Missing OPENAI_API_KEY" });
    }

    const body   = safeJSON(event.body);
    const brand  = (body.brand  || "").trim();
    const vibe   = (body.vibe   || "").trim();
    const colors = (body.colors || "").trim();
    const symbol = (body.symbol || "").trim();

    // Wordmark detection for clearer instructions
    const wantsWordmark = /no\s*symbol|wordmark|text[-\s]*only/i.test(symbol);
    const symbolLine = wantsWordmark
      ? "Design a typography-first, text-only wordmark. Exclude icons, pictograms, mascots, shapes, enclosures, and prohibition signs."
      : `Symbol direction: ${symbol || "abstract geometric mark"}. Avoid circle-slash/prohibition sign and literal clip-art.`;

    if (!brand) return json(400, { error: "Missing brand" });

    const sys = `You are a senior brand designer at an award-winning studio.
Write concise, client-facing creative briefs and production-ready logo prompts.
Return clean JSON only with keys: brief (string), prompts (string[]).
Do not include markdown or code fences.`;

    const user = `
Brand: ${brand}
Vibe words: ${vibe || "modern, clean"}
Preferred colors: ${colors || "designer's choice"}
${symbolLine}

Task:
1) Write a 120–180 word creative brief in plain language (no markdown headings). Tone: confident and professional, like a branding agency. Emphasize: scalability, simplicity, balanced geometry, negative space, timelessness, and brand-readiness (social icons, packaging, apparel).
2) Produce 3 distinct, high-quality one-sentence prompts for an image model to generate logo concepts.
   - Each prompt must be usable as-is by an image model (production-ready).
   - Include relevant style cues (e.g., minimal, geometric, negative space, iconic silhouette).
   - Respect the colors and symbol direction.
   - Assume flat vector look on dark background; exclude text-in-image, slogans, mockups, 3D, bevel, drop shadow, circle-slash/prohibition marks, emojis, and clip-art.
Return JSON only.`;

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        reasoning: { effort: "medium" },
        temperature: 0.8,
        input: [
          { role: "system", content: sys },
          { role: "user",   content: user }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "logo_brief",
            schema: {
              type: "object",
              properties: {
                brief:   { type: "string" },
                prompts: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 }
              },
              required: ["brief", "prompts"],
              additionalProperties: false
            }
          }
        }
      })
    });

    const data = await resp.json();

    let brief = "";
    let prompts = [];
    if (resp.ok) {
      const content =
        safeJSON(data?.output?.[0]?.content?.[0]?.text) ||
        safeJSON(data?.output_text) ||
        {};
      brief   = sanitize(content.brief || "");
      prompts = Array.isArray(content.prompts) ? content.prompts.map(sanitize) : [];
    } else {
      console.error("brief error:", data);
    }

    // 🔒 Final safeguard — never return empty
    if (!brief)   brief   = fallbackBrief({ brand, vibe, colors, symbol });
    if (!prompts || !prompts.length) prompts = fallbackPrompts({ brand, vibe, colors, symbol });

    return json(200, { brief, prompts });

  } catch (err) {
    console.error(err);
    return json(200, {
      brief:   fallbackBrief(safeJSON(event.body)),
      prompts: fallbackPrompts(safeJSON(event.body))
    });
  }
};

// ---------------- helpers ----------------
function json(status, obj) {
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}
function safeJSON(raw){ try { return JSON.parse(raw || "{}"); } catch { return {}; } }
function sanitize(s){ return String(s || "").replace(/[#*_`>]/g, "").trim(); }

function fallbackBrief({ brand="", vibe="", colors="", symbol="" } = {}) {
  const v = vibe   || "modern, minimal";
  const c = colors || "designer's choice";
  const s = symbol || "abstract geometric mark";
  return `${brand} is positioned with a ${v} personality. The logo should be simple, versatile and highly legible at small sizes. Use a restrained palette (${c}) and emphasize clarity, balanced proportions and strong negative space. Explore a ${s} that feels distinctive yet timeless; avoid detailed illustration or literal scenes. The mark should work alone or paired with logotype and export cleanly for social icons, packaging and apparel.`;
}

function fallbackPrompts({ brand="", vibe="", colors="", symbol="" } = {}) {
  const v   = (vibe   || "modern, minimal").toLowerCase();
  const c   = (colors || "navy and leaf green").toLowerCase();
  const sym = symbol ? symbol.toLowerCase() : "abstract geometric mark";
  return [
    `award-winning ${sym} logo for ${brand}, clean vector lines, minimal geometric shapes, strong negative space, timeless ${v} style, ${c}, professional polish, flat vector on dark background, brand-ready, no text, no slogans`,
    `luxury monogram inspired by ${sym} for ${brand}, bold and elegant grid-aligned proportions, iconic silhouette, ${v} branding aesthetic, ${c}, flat vector logo, professional design, brand-ready, no text`,
    `modern emblem evoking ${sym} for ${brand}, modular geometry, balanced symmetry, generous whitespace, premium finish, ${v} design, ${c}, minimal flat vector style, no lettering`
  ];
}
