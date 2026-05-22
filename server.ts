import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { booksData } from "./src/booksData";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // Initialize server-side Gemini client
  let ai: GoogleGenAI | null = null;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (geminiApiKey) {
    ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini client successfully initialized server-side.");
  } else {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Chat features will not work until set.");
  }

  // --- API Routes ---

  // 1. Get all books (summarized)
  app.get("/api/books", (req, res) => {
    const list = booksData.map(b => ({
      id: b.id,
      date: b.date,
      title: b.title,
      author: b.author,
      category: b.category,
      coverGradient: b.coverGradient,
      description: b.description,
      coreTakeaway: b.coreTakeaway,
    }));
    res.json(list);
  });

  // 2. Get details of a single book by ID/Date
  app.get("/api/books/:id", (req, res) => {
    const bookId = req.params.id;
    const book = booksData.find(b => b.id === bookId || b.date.replace(/\//g, "-") === bookId.replace(/\//g, "-"));
    if (!book) {
      return res.status(404).json({ error: `找不到該日期的書籍內容：${bookId}` });
    }
    res.json(book);
  });

  // 3. Dialogue session endpoint using Gemini API proxy
  app.post("/api/chat", async (req, res) => {
    const { bookId, messages, language } = req.body;

    if (!bookId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "缺少書本 ID 或對話歷史記錄" });
    }

    const book = booksData.find(b => b.id === bookId);
    if (!book) {
      return res.status(404).json({ error: `找不到該日期書本對話資料：${bookId}` });
    }

    if (!ai) {
      return res.status(500).json({
        error: "Gemini API 尚未配置。請在 AI Studio 中點擊 Settings > Secrets 並新增 GEMINI_API_KEY 變數以啟用此功能。"
      });
    }

    const targetLanguage = language === 'en-US' ? 'English' : '繁體中文 (Traditional Chinese / 台灣地區用語習慣)';

    try {
      // Structure the system rules and injection text
      const chaptersStr = book.chapters.map((ch, idx) => `  ${idx + 1}. ${ch.title}: ${ch.summary}`).join("\n");
      const conceptsStr = book.concepts.map((con, idx) => `  要點 ${idx + 1}：【${con.title}】\n  摘要：${con.description}\n  詳情說明：${con.extendedContent}`).join("\n\n");

      const systemInstruction = `你是一位專業、博學且極具同理心的「每日導讀教練（Daily Book Coach）」。
你精通這本書：《${book.title}》
作者：${book.author}
分類：${book.category}

這裡這本書的核心精華、章節大綱與重要觀點，這也是你唯一的對話依據：

【核心精華與主旨】
${book.coreTakeaway}

【代表金句】
${book.quote}

【章節大綱】
${chaptersStr}

【核心要點與深刻說明】
${conceptsStr}

【適合讀者群】
${book.targetAudience.join(", ")}

【導讀建議與練習】
${book.readingGuide}

---
你的對話指令與準則：
1. 請一律使用「${targetLanguage}」回覆使用者關於這本書的一切疑問。
2. 你的目標是：以輕鬆、啟發人心的聊天對話方式，引導、陪伴使用者理解這本書的核心概念「並且知道如何運用於日常生活中」。
3. 態度保持親近、溫暖、專業、邏輯清晰。你可以多用分段或有條理的條列式來回應。
4. 如果使用者提出完全「與本書內容不相干」或「完全離題」的事情，請用委婉幽默的方式把話題引導拉回這本書（例如：『這很有意思，但如果我們回到《${book.title}》這本書，書中提到的...』）。
5. 在對話一開始，你可以主動對部屬／故事的痛點提出反問，激發他們的學習慾。
6. 請適當在回答中提及：書中某章節、哪一個具體概念（例如：薩提爾的冰山理論、或是起承轉合故事架構），讓使用者感受到你是這本書的權威教練。`;

      // Map incoming messages to Gemini contents schema
      // Client role 'assistant' maps to 'model'
      const contents = messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

      // Call Gemini 3.5-flash
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      const replyText = response.text || "抱歉，我無法做出回應。";

      res.json({ reply: replyText });

    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error?.message || "調用 Gemini API 時發生未知錯誤" });
    }
  });

  // --- Vite Middleware in development, static build in production ---
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite dev middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Setting up production static file serving...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA catchall
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[每天對話一本書] Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
