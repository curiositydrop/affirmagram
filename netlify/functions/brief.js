// netlify/functions/brief.js
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.handler = async (event) => {
  try {
    if (!OPENAI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const brand  = (body.brand  || "").trim();
    const vibe   = (body.vibe   || "").trim();
    const colors = (body.colors || "").trim();
    const symbol = (body.symbol || "").trim();

    const system = `You are a senior brand designer.
Create a concise creative brief and 3–5 short logo prompts.
Rules:
- Favor simple, geometric, vector-friendly marks (good for SVG).
- Avoid trademarked imagery and generic stock-icon clichés.
- Use 2–3 colors max. Prefer HEX if provided.
- Each prompt under ~200 characters.`;

    const user = `Brand: ${brand}
Vibe: ${vibe}
Colors: ${colors}
Symbol preference: ${symbol}

Deliver:
1) One short creative brief paragraph (~3–5 sentences).
2) Then 3–5 bullet prompts for image generation.`;

    // Call OpenAI Chat Completions
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",        // use your preferred chat model
        temperature: 0.7,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: data }) };
    }

    const text = data.choices?.[0]?.message?.content || "";
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    // Grab brief as first paragraph-ish block
    let brief = "";
    let i = 0;
    while (i < lines.length && !lines[i].match(/^[-•]|\d+\)/)) {
      brief += (brief ? " " : "") + lines[i];
      i++;
    }

    // Collect 3–5 prompts (bullet lines)
    const prompts = lines
      .slice(i)
      .filter(l => /^[-•]|\d+\)/.test(l))
      .map(l => l.replace(/^[-•]\s*/, "").replace(/^\d+\)\s*/, ""))
      .slice(0, 5);

    return {
      statusCode: 200,
      body: JSON.stringify({
        brief: brief || "Clean, versatile logo direction.",
        prompts: prompts.length ? prompts : ["Minimal monogram in geometric style, high contrast, brand initials only."]
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
