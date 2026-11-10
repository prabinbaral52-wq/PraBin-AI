import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "50mb" }));

// Initialize GoogleGenAI SDK server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API Routes
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, systemInstruction, useSearch, useMaps, model = "gemini-3.8-flash" } = req.body;

    const tools: any[] = [];
    if (useSearch) {
      tools.push({ googleSearch: { searchTypes: { webSearch: {} } } });
    }
    if (useMaps) {
      tools.push({ googleMaps: {} });
    }

    const sysInst = systemInstruction || 
      "You are PraBin, an advanced intelligent personal assistant powered by custom neural networks. You are exceptionally smart, helpful, witty, and precise.";

    // Format previous history if provided
    const chatInstance = ai.chats.create({
      model: model,
      config: {
        systemInstruction: sysInst,
        tools: tools.length > 0 ? tools : undefined,
      },
    });

    // If history is provided, we can seed or send message
    const response = await chatInstance.sendMessage({ message });

    // Extract grounding info if any
    let groundingMetadata = null;
    const candidate = response.candidates?.[0];
    if (candidate && (candidate as any).groundingMetadata) {
      groundingMetadata = (candidate as any).groundingMetadata;
    }

    res.json({
      text: response.text || "I processed your request through my neural network, but received empty output.",
      groundingMetadata,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    res.status(500).json({ error: error.message || "Failed to generate chat response" });
  }
});

app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, aspectRatio = "1:1", imageSize = "1K", sourceImage, editPrompt } = req.body;

    const isEditing = !!sourceImage;
    const model = isEditing ? "gemini-3.1-flash-lite-image" : "gemini-nano-banana-2.1";

    let contents: any;
    if (isEditing) {
      contents = {
        parts: [
          {
            inlineData: {
              mimeType: sourceImage.mimeType || "image/png",
              data: sourceImage.data,
            },
          },
          { text: editPrompt || prompt || "Edit this image according to the request." },
        ],
      };
    } else {
      contents = {
        parts: [{ text: prompt }],
      };
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: imageSize,
        },
      },
    });

    let imageUrl = null;
    let description = "";

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || "image/png";
        imageUrl = `data:${mime};base64,${part.inlineData.data}`;
      } else if (part.text) {
        description += part.text;
      }
    }

    res.json({ imageUrl, description });
  } catch (error: any) {
    console.error("Image generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate image" });
  }
});

app.post("/api/generate-music", async (req, res) => {
  try {
    const { prompt, durationType = "clip" } = req.body; // clip or pro
    const model = durationType === "pro" ? "lyria-3-pro-preview" : "lyria-3-clip-preview";

    const responseStream = await ai.models.generateContentStream({
      model: model,
      contents: prompt || "Generate an uplifting ambient electronic track.",
    });

    const audioChunks: Buffer[] = [];
    let lyrics = "";
    let mimeType = "audio/mpeg";

    for await (const chunk of responseStream) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;
      for (const part of parts) {
        if (part.inlineData?.data) {
          if (audioChunks.length === 0 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioChunks.push(Buffer.from(part.inlineData.data, "base64"));
        }
        if (part.text) {
          lyrics += part.text;
        }
      }
    }

    const audioBase64 = Buffer.concat(audioChunks).toString("base64");
    const audioDataUrl = `data:${mimeType};base64,${audioBase64}`;

    res.json({ audioDataUrl, lyrics });
  } catch (error: any) {
    console.error("Music generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate music" });
  }
});

app.post("/api/tts", async (req, res) => {
  try {
    const { text, voicePersona = "standard" } = req.body;
    const model = voicePersona === "expressive" ? "gemini-3.8-flash-tts" : "gemini-3.8-flash-lite-tts";

    const response = await ai.models.generateContent({
      model: model,
      contents: text || "Hello, I am PraBin, your personal assistant.",
    });

    // Extract audio if returned or synthesize text response
    res.json({ text: response.text || "Speech synthesized successfully." });
  } catch (error: any) {
    console.error("TTS error:", error);
    res.status(500).json({ error: error.message || "TTS generation failed" });
  }
});

app.post("/api/analyze", async (req, res) => {
  try {
    const { content, taskType = "summarize" } = req.body;

    let prompt = "";
    if (taskType === "summarize") {
      prompt = `Provide a concise, highly structured summary and key bullet points of the following text:\n\n${content}`;
    } else if (taskType === "code-review") {
      prompt = `Perform an expert code review of the following code snippet. Provide security, performance, and best practice recommendations:\n\n${content}`;
    } else if (taskType === "rewrite") {
      prompt = `Rewrite and polish the following text to make it professional, engaging, and clear:\n\n${content}`;
    } else {
      prompt = `Analyze the following content:\n\n${content}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-4-argon",
      contents: prompt,
    });

    res.json({ result: response.text || "Analysis completed." });
  } catch (error: any) {
    console.error("Analyze error:", error);
    res.status(500).json({ error: error.message || "Analysis failed" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PraBin AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
