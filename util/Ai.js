import OpenAI from "openai";
import fs from "fs";
import "dotenv/config";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 👈 match your .env
});

export async function retrieveAiResponse(imagePath, promptText) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${base64Image}` },
            },
          ],
        },
      ],
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error retrieving AI response:", error);
    throw error;
  }
}
