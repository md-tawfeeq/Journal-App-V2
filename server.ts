import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Lazy initialization of GoogleGenAI SDK
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured. Please ensure it is set in Settings/Secrets.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

interface ChatHistoryItem {
  role: "user" | "model";
  text: string;
}

interface GenerateWithFallbackOptions {
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  systemInstruction?: string;
}

async function generateContentWithFallback(options: GenerateWithFallbackOptions): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAI();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.systemInstruction ? { systemInstruction: options.systemInstruction } : undefined,
      });

      const responseText = response.text || "";
      if (responseText.trim().length > 0) {
        return { text: responseText, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Model ${model} failed or returned error:`, err?.message || err);
      lastError = err;
      // Recoverable error check: continue to next fallback model
      const status = err?.status || err?.statusCode || (err?.response && err.response.status);
      const isRecoverable =
        status === 503 ||
        status === 429 ||
        status === 404 ||
        status === 500 ||
        (err?.message && (err.message.includes("not found") || err.message.includes("quota") || err.message.includes("overloaded") || err.message.includes("resource exhausted")));

      if (!isRecoverable && status && status >= 400 && status < 500 && status !== 429 && status !== 404) {
        // Non-recoverable client error, throw immediately
        throw err;
      }
    }
  }

  throw new Error(`All Gemini models in fallback ladder failed. Last error: ${lastError?.message || "Unknown error"}`);
}

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Gemini Reflection & Journal endpoint
app.post("/api/gemini/reflect", async (req: Request, res: Response) => {
  // Defensive Payload Ingestion (Null-Safe Destructuring)
  const body = (req.body && typeof req.body === "object") ? req.body : {};
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const mode = typeof body.mode === "string" ? body.mode : "reflect";
  const history: ChatHistoryItem[] = Array.isArray(body.history) ? body.history : [];

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required and cannot be empty." });
  }

  if (prompt.length > 20000) {
    return res.status(400).json({ error: "Input exceeds maximum character limit of 20,000 characters." });
  }

  const systemInstructionsByMode: Record<string, string> = {
    reflect: `You are an empathetic, insightful, and thoughtful reflective journaling partner. 
Your goal is to help the user process their thoughts, emotions, dilemmas, and achievements with warmth, psychological safety, and perceptive depth. 
Acknowledge their sentiments genuinely, offer gentle reframing or guiding questions to deepen their self-awareness, and highlight positive growth or hidden strengths. 
Use clean formatting with markdown paragraphs, bullet points, or guiding inquiry prompts when appropriate.`,
    summarize: `You are an executive reflection summarizer.
Your goal is to synthesize the user's journal entry into:
1. **Core Theme & Key Takeaways**: The heart of what was experienced or contemplated.
2. **Emotional & Mental State**: Nuances of sentiment, mindset, or energy.
3. **Actionable Insights & Next Steps**: 2-4 concrete, grounding steps or questions for tomorrow.
Be succinct, clear, structured, and insightful.`,
    brainstorm: `You are an inventive and structured brainstorming coach.
Given the user's journal, project idea, or challenge:
1. Clarify the core opportunity or obstacle.
2. Provide 3-5 creative, distinct angles or solutions (ranging from quick-wins to bold lateral ideas).
3. Offer a recommended immediate first experiment or reflective exercise to test the best idea.`,
    chat: `You are a supportive, intelligent conversational companion for personal growth, journaling, and daily reflection. 
Respond naturally, converse constructively, and maintain context from earlier entries in this session.`,
  };

  const selectedInstruction = systemInstructionsByMode[mode] || systemInstructionsByMode.reflect;

  // Build message contents for Gemini SDK
  const formattedContents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  for (const item of history) {
    if (item && typeof item.text === "string" && item.text.trim()) {
      formattedContents.push({
        role: item.role === "model" ? "model" : "user",
        parts: [{ text: item.text.trim() }],
      });
    }
  }

  // Append current prompt
  formattedContents.push({
    role: "user",
    parts: [{ text: prompt }],
  });

  try {
    const result = await generateContentWithFallback({
      contents: formattedContents,
      systemInstruction: selectedInstruction,
    });

    return res.json({
      success: true,
      response: result.text,
      modelUsed: result.modelUsed,
      mode,
    });
  } catch (error: any) {
    console.error("[Gemini API Error]:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate reflection from Gemini.",
      recoverable: true,
    });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
