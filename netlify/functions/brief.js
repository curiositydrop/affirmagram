import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function handler(event) {
  try {
    const { brand, vibe, colors, symbol } = JSON.parse(event.body || "{}");

    if (!brand || !vibe) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing brand or vibe" })
      };
    }

    const systemPrompt = `
You are a professional brand identity designer.
Write a concise creative brief for a logo design based on:
Brand: ${brand}
Vibe: ${vibe}
Colors: ${colors}
Symbol: ${symbol}

Then give 3 short, polished image prompts for an AI image generator to make this logo.
Make prompts descriptive of style, layout, and design.
    `;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }]
    });

    const text = completion.choices[0].message.content || "";
    const [brief, ...prompts] = text.split("\n").filter(Boolean);

    return {
      statusCode: 200,
      body: JSON.stringify({
        brief,
        prompts
      })
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Server error" })
    };
  }
}
