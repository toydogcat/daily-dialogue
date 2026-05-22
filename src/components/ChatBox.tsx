import React, { useState, useRef, useEffect } from "react";
import { Book } from "../booksData";
import { Send, Sparkles, RefreshCw, AlertCircle, Calendar, HelpCircle, ArrowRight, Mic, Volume2 } from "lucide-react";
import { useWebLLM } from "../hooks/useWebLLM";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatBoxProps {
  book: Book;
  language: "zh-TW" | "en-US";
  aiVoice: "male" | "female";
  fontSize: "small" | "medium" | "large";
  geminiKey: string;
  aiEngine: "gemini" | "local";
  webLLM: ReturnType<typeof useWebLLM>;
}

export default function ChatBox({ 
  book, 
  language, 
  aiVoice, 
  fontSize, 
  geminiKey,
  aiEngine,
  webLLM
}: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Computed font size class
  const fontSizeClass = fontSize === "small" ? "text-xs" : fontSize === "large" ? "text-base" : "text-sm";

  // Suggestion questions specific to each book to spark users' interest
  const getSuggestions = () => {
    if (language === "en-US") {
      if (book.id === "2026-05-20") {
        return [
          "What is 'Career Capital' and how do I build it?",
          "Why is 'following your passion' dangerous advice?",
          "What are the Control Traps and how do I avoid them?"
        ];
      } else if (book.id === "2026-05-21") {
        return [
          "What is the Satir Iceberg Model?",
          "How to respond when an employee is blaming others?",
          "Can you share a practical coaching example?"
        ];
      } else {
        return [
          "Why is 'Struggle' central to a good story?",
          "What are the 6 types of stories a leader needs?",
          "How to turn dry data into an engaging story?"
        ];
      }
    } else {
      if (book.id === "2026-05-20") {
        return [
          "什麼是「職涯資本」？我該如何透過刻意練習累積它？",
          "為什麼「追隨熱情」是個危險的職涯迷思？",
          "什麼是「自主權陷阱」？要如何避免在實力不足時掉入其中？"
        ];
      } else if (book.id === "2026-05-21") {
        return [
          "什麼是薩提爾冰山理論？能舉一個經典職場例子嗎？",
          "員工擺出「超理智」或「指責」姿態時，主管該如何提問？",
          "可以分享薩提爾教練在績效面談中的實際例子嗎？"
        ];
      } else {
        return [
          "故事巧實力的黃金架構裡，「掙扎」為何是主角？",
          "主管為什麼一定要準備這六種故事類型？",
          "教我如何把乾巴巴的數據報告講成好故事？"
        ];
      }
    }
  };

  // Prepopulate with a friendly introductory message from the AI Coach
  useEffect(() => {
    let welcomeText = "";
    
    if (language === "en-US") {
      if (book.id === "2026-05-20") {
        welcomeText = `Hello! I am your dedicated study coach for "${book.title}". How can we build your career capital and escape the passion trap today?`;
      } else if (book.id === "2026-05-21") {
        welcomeText = `Hello! I am your dedicated study coach for "${book.title}". How can we apply the Satir model to your work today?`;
      } else {
        welcomeText = `Welcome! I am your coach for "${book.title}". Let's dive into the power of storytelling today!`;
      }
    } else {
      if (book.id === "2026-05-20") {
        welcomeText = `您好！我是您的專屬《深度職場力》導學教練 📚。今天想探討如何累積職涯資本、把自己變強，還是避開自主權陷阱呢？`;
      } else if (book.id === "2026-05-21") {
        welcomeText = `您好！我是您的專屬《激發員工潛力的薩提爾教練模式》讀書伴侶 📚。今天想探討什麼呢？`;
      } else {
        welcomeText = `歡迎到來！我是您的專屬《會說故事的巧實力！》導學教練 🌟。讓我們開始吧！`;
      }
    }

    setMessages([
      {
        id: "welcome-msg",
        role: "assistant",
        content: welcomeText,
      },
    ]);
    setErrorMsg(null);
  }, [book, language]);

  // Scroll to bottom whenever messages list grows
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsgId = Date.now().toString();
    const newUserMsg: Message = {
      id: userMsgId,
      role: "user",
      content: textToSend,
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInput("");
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const targetLanguage = language === 'en-US' ? 'English' : '繁體中文 (Traditional Chinese / 台灣地區用語習慣)';
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

      let replyText = "";

      if (aiEngine === "local") {
        if (!webLLM.isLoaded || !webLLM.engine) {
          throw new Error(language === "en-US" ? "Local AI is not initialized yet." : "本地 AI 尚未載入就緒！");
        }

        const messagesForLLM = [
          { role: "system", content: systemInstruction },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: "user", content: textToSend }
        ];

        // First add an empty model reply for typing stream
        const replyId = `ai-msg-${Date.now()}`;
        setMessages(prev => [
          ...prev,
          {
            id: replyId,
            role: "assistant",
            content: ""
          }
        ]);

        const chunks = await webLLM.engine.chat.completions.create({
          messages: messagesForLLM as any,
          stream: true,
          temperature: 0.7,
        });

        for await (const chunk of chunks) {
          const delta = chunk.choices[0]?.delta?.content || "";
          replyText += delta;
          setMessages(prev => {
            return prev.map(m => m.id === replyId ? { ...m, content: replyText } : m);
          });
        }
      } else {
        if (!geminiKey) {
          throw new Error(language === "en-US" ? "Please enter your Gemini API Key in Settings first." : "請先在設定中輸入您的 Gemini API Key！");
        }

        const contents = [...messages, newUserMsg].map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        }));

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: contents,
            generationConfig: { temperature: 0.7 }
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || "API 請求失敗，請確認您的 API Key 是否正確或有額度。");
        }

        replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "抱歉，我無法做出回應。";

        setMessages(prev => [
          ...prev,
          {
            id: `ai-msg-${Date.now()}`,
            role: "assistant",
            content: replyText
          }
        ]);
      }
      
      // Auto-speak the response
      speakText(replyText);

    } catch (err: any) {
      console.error("Chat action failed:", err);
      setErrorMsg(err.message || "發生錯誤，請確認設定中的 API Key 或本地模型是否正常。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm("要重置這本書的對話歷史嗎？ (Reset chat history?)")) {
      let initialText = "";
      if (language === "en-US") {
        initialText = "History cleared! Let's start over.";
      } else {
        if (book.id === "2026-05-20") {
          initialText = "重置完成！讓我們重新探討如何專心把自己變強吧。";
        } else if (book.id === "2026-05-21") {
          initialText = "重置完成！重新向您的薩提爾讀書客座教練提問吧。";
        } else {
          initialText = "重置完成！讓我們重新探討說故事的巧實力吧。";
        }
      }
      setMessages([
        {
          id: `cleared-${Date.now()}`,
          role: "assistant",
          content: initialText,
        },
      ]);
      setErrorMsg(null);
    }
  };

  // --- Voice Input (Speech Recognition) ---
  const toggleListening = () => {
    if (isListening) return; // Currently simple single shot
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("您的瀏覽器不支援語音輸入 (Speech Recognition not supported in this browser).");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? " " : "") + speechResult);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // --- Voice Output (Speech Synthesis) ---
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    
    // Voice selection logic based on male/female preference
    const voices = window.speechSynthesis.getVoices();
    const langVoices = voices.filter(v => v.lang.includes(language.split('-')[0]));
    
    if (langVoices.length > 0) {
      // Basic heuristic: some voices indicate male/female in name
      let selectedVoice = langVoices.find(v => v.name.toLowerCase().includes(aiVoice));
      if (!selectedVoice) {
        // Fallback to first available if explicit match not found
        selectedVoice = langVoices[0];
      }
      utterance.voice = selectedVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  // Load voices on mount
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  const isLocalPending = aiEngine === "local" && !webLLM.isLoaded;

  return (
    <div id="chat-box-container" className="flex flex-col h-[640px] bg-natural-bg rounded-3xl border border-natural-border shadow-2xs overflow-hidden animate-fade-in">
      {/* Top Header details of the Coach */}
      <div className="px-6 py-4.5 bg-natural-sage text-[#FDFCF8] flex justify-between items-center shrink-0 border-b border-natural-border/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-serif italic text-base font-bold text-white shadow-3xs select-none">
            {book.title.slice(0, 1)}
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm tracking-wide flex items-center gap-1.5 text-[#FDFCF8]">
              <span>{book.title}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            </h3>
            <p className="text-[10px] text-white/70 font-mono tracking-wider uppercase">
              DAILY DIALOGUE COACH • {aiEngine === "local" ? "LOCAL GPU AI" : "CLOUD GEMINI"}
            </p>
          </div>
        </div>

        <button
          onClick={handleClearHistory}
          disabled={isLocalPending}
          title="重置對話"
          className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Message and response body area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-natural-cream/60 border-b border-natural-border/30">
        {isLocalPending ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-[#6B705C]/10 flex items-center justify-center border border-[#6B705C]/20 shadow-2xs">
              <Sparkles className="w-8 h-8 text-[#6B705C] animate-pulse" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h4 className="font-serif font-bold text-[#6B705C] text-base">啟動瀏覽器本地 AI 伴讀教練</h4>
              <p className="text-xs text-natural-sand leading-relaxed">
                我們將在您的瀏覽器中加載 <b>Gemma 2B</b> 模型。這完全運行在您本機的 GPU 上，<b>100% 離線隱私安全</b>。
              </p>
            </div>

            {webLLM.status.includes("正在") || webLLM.status.includes("Loading") || webLLM.progress > 0 ? (
              <div className="w-full max-w-xs space-y-3">
                <div className="w-full bg-natural-warm rounded-full h-2 border border-natural-border overflow-hidden relative">
                  <div 
                    className="bg-[#6B705C] h-full transition-all duration-300 rounded-full" 
                    style={{ width: `${webLLM.progress}%` }} 
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-natural-sand font-mono">
                  <span className="truncate max-w-[200px] text-left font-sans">{webLLM.status}</span>
                  <span className="font-bold text-[#6B705C]">{webLLM.progress}%</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => webLLM.init()}
                className="px-6 py-2.5 bg-[#6B705C] hover:bg-[#555849] text-white rounded-xl shadow-xs transition-all hover:scale-105 active:scale-95 font-serif font-bold text-xs cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-spin" />
                下載並啟動 AI 教練 (Gemma 2B)
              </button>
            )}

            <div className="text-[10px] text-natural-sand/70 max-w-xs italic leading-tight">
              首次使用需要下載約 1.4GB 權重資料，下載後會緩存於您的瀏覽器中，下次打開即是秒開。
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 max-w-[85%] ${
                  m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {/* Persona Avatar icons */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-mono leading-none shadow-3xs ${
                    m.role === "user"
                      ? "bg-natural-sage-dark text-[#FDFCF8]"
                      : "bg-natural-sand text-white font-serif italic"
                  }`}
                >
                  {m.role === "user" ? "Me" : "AI"}
                </div>

                {/* Bubble layout context */}
                <div className="space-y-1">
                  <div
                    className={`p-4 rounded-2xl ${fontSizeClass} leading-relaxed whitespace-pre-line relative group ${
                      m.role === "user"
                        ? "bg-natural-sage text-[#FDFCF8] rounded-tr-none"
                        : "bg-natural-bg text-natural-dark border border-natural-border rounded-tl-none shadow-3xs font-serif"
                    }`}
                  >
                    {m.content}
                    
                    {m.role === "assistant" && m.content && (
                      <button 
                        onClick={() => speakText(m.content)}
                        className="absolute -right-8 bottom-0 p-1.5 text-natural-sand hover:text-natural-sage opacity-0 group-hover:opacity-100 transition-opacity"
                        title="朗讀 (Read Aloud)"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-natural-sand block px-1.5 font-mono tracking-wider">
                    {m.role === "user" ? (language === "en-US" ? "User" : "讀者提問") : (language === "en-US" ? "Coach" : "導讀教練")}
                  </span>
                </div>
              </div>
            ))}

            {/* Dynamic Typing indicators spinner */}
            {isLoading && (
              <div className="flex gap-3 max-w-[85%] animate-fade-in">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold bg-natural-sand text-white font-serif italic animate-pulse">
                  AI
                </div>
                <div className="bg-natural-bg border border-natural-border p-4 rounded-2xl rounded-tl-none shadow-3xs">
                  <div className="flex gap-1.5 items-center justify-center py-1 px-2">
                    <span className="w-2 h-2 rounded-full bg-natural-sand animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-natural-sand animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-natural-sand animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Warning card for missing API config */}
            {errorMsg && (
              <div className="p-4 bg-natural-warm/80 border border-rose-200 text-[#C15C5C] rounded-2xl flex gap-3 animate-fade-in max-w-[95%]">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-2.5">
                  <p className="text-sm font-semibold text-rose-900 font-serif">對話傳送失敗 (Error)</p>
                  <p className="text-xs text-rose-800 leading-relaxed font-sans">
                    {errorMsg}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested question pills */}
      {messages.length <= 3 && !isLoading && !isLocalPending && (
        <div className="px-6 py-3 border-t border-natural-border bg-natural-bg shrink-0 select-none animate-fade-in">
          <p className="text-[10px] font-bold text-natural-sand flex items-center gap-1.5 mb-2 uppercase tracking-wider font-mono">
            <HelpCircle className="w-3.5 h-3.5 text-natural-sand" />
            {language === "en-US" ? "You can ask:" : "您可以這樣與伴讀教練展開深度討論："}
          </p>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {getSuggestions().map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(suggestion)}
                className="text-xs bg-natural-warm text-natural-dark hover:text-white border border-natural-border hover:bg-natural-sage hover:border-natural-sage rounded-full px-3.5 py-1.5 transition-all text-left truncate max-w-full inline-flex items-center gap-1.5 shadow-3xs cursor-pointer"
              >
                <span>{suggestion}</span>
                <ArrowRight className="w-3.5 h-3.5 text-natural-sand shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Text form submit bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(input);
        }}
        className="p-4 border-t border-natural-border flex gap-2 md:gap-3 items-center bg-natural-bg shrink-0"
      >
        <button
          type="button"
          onClick={toggleListening}
          disabled={isLoading || isListening || isLocalPending}
          className={`p-3 rounded-xl shadow-xs transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed ${isListening ? "bg-red-500 text-white animate-pulse" : "bg-natural-warm text-natural-dark hover:bg-natural-border"}`}
          title="語音輸入 (Voice Input)"
        >
          <Mic className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isLocalPending 
              ? (language === "en-US" ? "Please start Local AI first..." : "請先啟動本地 AI 教練...") 
              : (language === "en-US" ? "Ask a question..." : `對《${book.title}》提出問題...`)
          }
          disabled={isLoading || isListening || isLocalPending}
          className={`flex-1 bg-natural-warm border border-natural-border focus:border-natural-sage focus:bg-natural-bg rounded-xl px-4 py-3 ${fontSizeClass} text-natural-dark placeholder-natural-sand focus:outline-none focus:ring-1 focus:ring-natural-sage disabled:opacity-50 transition-all font-sans`}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading || isLocalPending}
          className="p-3 bg-natural-sage hover:bg-natural-sage-dark text-white rounded-xl shadow-xs disabled:bg-natural-warm disabled:text-natural-sand transition-colors cursor-pointer shrink-0 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

