import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

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

// SSE Streaming Chat Endpoint (Ultra-fast real-time response)
app.post("/api/chat/stream", async (req, res) => {
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    const {
      message,
      history = [],
      systemInstruction,
      useSearch,
      useMaps,
      model = "gemini-3.1-flash-lite", // Default to ultra-fast flash-lite
    } = req.body;

    const tools: any[] = [];
    if (useSearch) {
      tools.push({ googleSearch: { searchTypes: { webSearch: {} } } });
    }
    if (useMaps) {
      tools.push({ googleMaps: {} });
    }

    const sysInst =
      systemInstruction ||
      "You are PraBin, an ultra-fast intelligent personal assistant powered by custom neural networks. You deliver clear, helpful, accurate, and insightful responses instantly.";

    // Convert client history to GenAI SDK format { role: 'user' | 'model', parts: [{ text: string }] }
    const formattedHistory = (history || [])
      .filter((h: any) => h.content && h.content.trim().length > 0)
      .map((h: any) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      }));

    const chatInstance = ai.chats.create({
      model: model,
      history: formattedHistory,
      config: {
        systemInstruction: sysInst,
        tools: tools.length > 0 ? tools : undefined,
      },
    });

    const responseStream = await chatInstance.sendMessageStream({ message });

    let fullText = "";
    let groundingMetadata: any = null;

    for await (const chunk of responseStream) {
      const chunkText = chunk.text || "";
      if (chunkText) {
        fullText += chunkText;
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }

      const candidate = chunk.candidates?.[0];
      if (candidate && (candidate as any).groundingMetadata) {
        groundingMetadata = (candidate as any).groundingMetadata;
      }
    }

    // Send final event with metadata if present
    res.write(
      `data: ${JSON.stringify({
        done: true,
        fullText,
        groundingMetadata,
      })}\n\n`
    );
    res.end();
  } catch (error: any) {
    console.error("Chat Stream API error:", error);
    res.write(
      `data: ${JSON.stringify({
        error: error.message || "Failed to generate stream response",
      })}\n\n`
    );
    res.end();
  }
});

// Non-streaming chat fallback
app.post("/api/chat", async (req, res) => {
  try {
    const {
      message,
      history = [],
      systemInstruction,
      useSearch,
      useMaps,
      model = "gemini-3.1-flash-lite",
    } = req.body;

    const tools: any[] = [];
    if (useSearch) {
      tools.push({ googleSearch: { searchTypes: { webSearch: {} } } });
    }
    if (useMaps) {
      tools.push({ googleMaps: {} });
    }

    const sysInst =
      systemInstruction ||
      "You are PraBin, an intelligent personal assistant powered by custom neural networks.";

    const formattedHistory = (history || [])
      .filter((h: any) => h.content && h.content.trim().length > 0)
      .map((h: any) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      }));

    const chatInstance = ai.chats.create({
      model: model,
      history: formattedHistory,
      config: {
        systemInstruction: sysInst,
        tools: tools.length > 0 ? tools : undefined,
      },
    });

    const response = await chatInstance.sendMessage({ message });

    let groundingMetadata = null;
    const candidate = response.candidates?.[0];
    if (candidate && (candidate as any).groundingMetadata) {
      groundingMetadata = (candidate as any).groundingMetadata;
    }

    res.json({
      text: response.text || "Processed request successfully.",
      groundingMetadata,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    res.status(500).json({ error: error.message || "Failed to generate chat response" });
  }
});

// Image Generation & Editing
app.post("/api/generate-image", async (req, res) => {
  try {
    const {
      prompt,
      aspectRatio = "1:1",
      imageSize = "1K",
      sourceImage,
      editPrompt,
      quality = "fast", // 'fast' -> gemini-3.1-flash-lite-image, 'hd' -> gemini-nano-banana-2.1
    } = req.body;

    const isEditing = !!sourceImage;
    // For editing or fast mode use gemini-3.1-flash-lite-image; for HD generation use nano-banana-2.1
    const model = isEditing || quality === "fast"
      ? "gemini-3.1-flash-lite-image"
      : "gemini-nano-banana-2.1";

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
          { text: editPrompt || prompt || "Edit this image as requested." },
        ],
      };
    } else {
      contents = {
        parts: [{ text: prompt }],
      };
    }

    // Only nano-banana-2.1 and gemini-3-pro-image support imageSize
    const imageConfig: any = { aspectRatio };
    if (model === "gemini-nano-banana-2.1") {
      imageConfig.imageSize = imageSize || "1K";
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        imageConfig,
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

// Video Generation & Animation (Omni Flash via Interactions API)
app.post("/api/generate-video", async (req, res) => {
  try {
    const { prompt, sourceImage, aspectRatio = "16:9", duration = "5s" } = req.body;

    let input: any;
    if (sourceImage && sourceImage.data) {
      input = [
        {
          type: "image",
          mime_type: sourceImage.mimeType || "image/png",
          data: sourceImage.data,
        },
        {
          type: "text",
          text: prompt || "Animate this image with smooth, natural cinematic motion.",
        },
      ];
    } else {
      input = prompt || "A cinematic aerial view of a futuristic neon city at sunset.";
    }

    const interaction = await ai.interactions.create(
      {
        model: "gemini-omni-1.2-flash",
        input: input,
        background: false,
        store: false,
        stream: false,
        response_format: {
          type: "video",
          aspect_ratio: aspectRatio === "9:16" ? "9:16" : "16:9",
          duration: duration || "5s",
          resolution: "720p",
        },
      },
      { timeout: 300000 }
    );

    const videoPart = (interaction as any).output_video;
    if (videoPart && videoPart.data) {
      const mime = videoPart.mime_type || "video/mp4";
      const videoUrl = `data:${mime};base64,${videoPart.data}`;
      res.json({ videoUrl });
    } else {
      res.status(500).json({ error: "No video stream returned from neural network." });
    }
  } catch (error: any) {
    console.error("Video generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate video" });
  }
});

// Lyria Music Generation
app.post("/api/generate-music", async (req, res) => {
  try {
    const { prompt, durationType = "clip" } = req.body;
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

// Text-to-Speech (TTS)
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voiceName = "Kore" } = req.body;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: text.slice(0, 500) || "Hello, I am PraBin.",
            },
          ],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const mime = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || "audio/wav";
      res.json({ audioUrl: `data:${mime};base64,${base64Audio}` });
    } else {
      res.json({ text: response.text || "Generated speech" });
    }
  } catch (error: any) {
    console.error("TTS error:", error);
    res.status(500).json({ error: error.message || "TTS generation failed" });
  }
});

// Intelligence Hub Analysis (Fast Lite vs Argon 4 Deep)
app.post("/api/analyze", async (req, res) => {
  try {
    const { content, taskType = "summarize", speed = "fast" } = req.body;

    let prompt = "";
    if (taskType === "summarize") {
      prompt = `Provide a concise, ultra-structured summary with key bullet points of the following content:\n\n${content}`;
    } else if (taskType === "code-review") {
      prompt = `Perform an expert code review of the following code snippet. Provide security, performance, and best practice recommendations:\n\n${content}`;
    } else if (taskType === "rewrite") {
      prompt = `Rewrite and polish the following text to make it professional, engaging, and clear:\n\n${content}`;
    } else {
      prompt = `Analyze the following content:\n\n${content}`;
    }

    const model = speed === "fast" ? "gemini-3.1-flash-lite" : "gemini-4-argon";

    const response = await ai.models.generateContent({
      model: model,
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
