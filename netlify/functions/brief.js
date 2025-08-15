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

    if (!brand) return json(400, { error: "Missing brand" });

    const sys = `You write concise creative briefs and logo prompts.
Return clean JSON only with keys: brief (string), prompts (string[]).
Don't include backticks or markdown fences.`;

    const user = `
Brand: ${brand}
Vibe words: ${vibe || "modern, clean"}
Preferred colors: ${colors || "designer's choice"}
Symbol idea: ${symbol || "abstract mark"}

Task:
1) Write a short (120–180 words) creative brief in plain text (no markdown headings).
2) Produce 3 distinct, high-quality text prompts for an image model to generate logo concepts.
   - Each prompt should be a single sentence.
   - Include style words from the brief (e.g., minimal, geometric, negative space).
   - Respect the colors and symbol direction.
   - Avoid text-in-image like slogans. Focus on a mark/symbol/monogram.
`;

    // Responses API (JSON mode)
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        reasoning: { effort: "medium" },
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

    if (!brief)   brief   = fallbackBrief({ brand, vibe, colors, symbol });
    if (!prompts.length) prompts = fallbackPrompts({ brand, vibe, colors, symbol });

    return json(200, { brief, prompts });
  } catch (err) {
    console.error(err);
    return json(200, {
      brief:   fallbackBrief(safeJSON(event.body)),
      prompts: fallbackPrompts(safeJSON(event.body))
    });
  }
};

// -------- helpers --------
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
    `minimal ${sym} for ${brand}, clean geometric shapes, strong negative space, ${v} style, flat vector look, centered composition, ${c}, studio lighting, no text, plain background`,
    `iconic monogram inspired by ${sym} for ${brand}, sharp angles and rounded balance, grid-aligned, high contrast, ${v}, flat logo rendering, ${c}, no words, no gradients`,
    `simple emblem evoking ${sym} for ${brand}, modular geometry, balanced symmetry, generous whitespace, ${v} aesthetic, brand-ready, ${c}, crisp edges, no lettering`
  ];
}
