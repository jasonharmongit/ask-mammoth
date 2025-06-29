import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const app = express();
const port = 3000;

app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/assistant", async (req, res) => {
  const { messages } = req.body;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano-2025-04-14",
      messages,
    });
    res.json(completion);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
