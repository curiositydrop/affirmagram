// netlify/functions/render.js
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.handler = async (event) => {
  try {
    if (!OPENAI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: { message: "Missing OPENAI_API_KEY" } }) };
    }

    if (event.queryStringParameters?.debug === '1') {
      // tiny ping to prove key works
      const probe = await fetch("https://api.openai.com/v1/models/gpt-image-1", {
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }
      });
      const probeJson = await probe.json();
      return { statusCode: 200, body: JSON.stringify({ debug: true, usingKeyEndsWith: OPENAI_API_KEY.slice(-4), openAIResponse: probeJson }) };
    }

    const body = JSON.parse(event.body || "{}");
    const prompt = (body.prompt || "").trim();
    const size = body.size || "1024x1024";
    const n = body.n || 4;

    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: { message: "Missing prompt" } }) };
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
      // pass through OpenAI’s error clearly
      return {
        statusCode: imgRes.status,
        body: JSON.stringify({
          error: imgData?.error || imgData || { message: "Unknown error from OpenAI" }
        })
      };
    }

    const pngs = (imgData.data || []).map(d => `data:image/png;base64,${d.b64_json}`);
    return { statusCode: 200, body: JSON.stringify({ pngs }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: String(err) } }) };
  }
};
