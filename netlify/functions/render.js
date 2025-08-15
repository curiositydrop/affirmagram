// netlify/functions/render.js
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.handler = async (event) => {
  try {
    if (!OPENAI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const prompt = (body.prompt || "").trim();
    const n = body.n || 4;  // keep at 4 previews
    const size = "1024x1024"; // lock size to 1024x1024

    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing prompt" }) };
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
        size,
        n
      })
    });

    const imgData = await imgRes.json();
    if (!imgRes.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: imgData }) };
    }

    const pngs = (imgData.data || []).map(d => `data:image/png;base64,${d.b64_json}`);

    return { statusCode: 200, body: JSON.stringify({ pngs }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
