import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function handler(event) {
  try {
    const { prompt, size, n } = JSON.parse(event.body || "{}");

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing prompt" })
      };
    }

    const response = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size: size || "1024x1024",
      n: n || 1
    });

    const pngs = (response.data || []).map(img => img.b64_json
      ? `data:image/png;base64,${img.b64_json}`
      : img.url
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ pngs })
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Server error" })
    };
  }
}
