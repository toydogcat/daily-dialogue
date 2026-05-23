import React, { useState, useRef, useEffect } from "react";
import { BookMetadata } from "../booksData";
import { Send, Sparkles, RefreshCw, AlertCircle, HelpCircle, ArrowRight, Mic, Volume2 } from "lucide-react";
import { useWebLLM } from "../hooks/useWebLLM";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface GuideChatBoxProps {
  books: BookMetadata[];
  language: "zh-TW" | "en-US";
  aiVoice: "male" | "female";
  fontSize: "small" | "medium" | "large";
  geminiKey: string;
  aiEngine: "gemini" | "local";
  webLLM: ReturnType<typeof useWebLLM>;
  onSelectBook: (id: string) => void;
}

export default function GuideChatBox({
  books,
  language,
  aiVoice,
  fontSize,
  geminiKey,
  aiEngine,
  webLLM,
  onSelectBook
}: GuideChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Computed font size class
  const fontSizeClass = fontSize === "small" ? "text-xs" : fontSize === "large" ? "text-base" : "text-sm";

  // Prepopulate with a friendly introductory message from the AI Curator
  useEffect(() => {
    let welcomeText = "";
    if (language === "en-US") {
      welcomeText = "Hello! I am your AI Book Curator 🌟. Tell me what challenges you are facing in your life, career, or self-development today, and I will recommend the perfect reading companion from our daily selection for you!";
    } else {
      welcomeText = "您好！我是您的智慧 AI 圖書館長 📚。今天不論您是在職場溝通、團隊管理、人際表達還是生活心靈上面臨任何瓶頸，都可以隨時向我傾訴，我會從每日好書中挑選最適合的伴讀精華推薦給您！";
    }

    setMessages([
      {
        id: "guide-welcome-msg",
        role: "assistant",
        content: welcomeText,
      },
    ]);
    setErrorMsg(null);
  }, [language]);

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
      
      // Compile all books metadata as AI context
      const booksContextStr = books.map(b => 
        `- 書籍 ID (ID): "${b.id}"\n  書名: 《${b.title}》\n  作者: ${b.author}\n  分類: ${b.category}\n  核心精華: ${b.coreTakeaway}\n  適合對象: ${b.targetAudience.join(", ")}`
      ).join("\n\n");

      const systemInstruction = `你是一位專業且極具同理心的「智慧圖書館長（AI Library Curator）」，精通我們館藏的所有精選好書。
以下是目前我們館藏的每日書籍資料庫，這是你唯一的推薦依據：

${booksContextStr}

你的對話指令與準則：
1. 請一律使用「${targetLanguage}」與讀者交流。
2. 你的目標是：傾聽讀者最近在工作、職場、人際關係、心理或生活上碰到的任何痛點、難題或想精進的方向，並「挑選 1 本最適合的好書」推薦給他。
3. 態度保持溫暖、耐心、專業，引導讀者說出更多細節。
4. 當你在推薦某本書時，你「必須」在提及該書的段落或結尾，輸出格式為 [BOOK:書籍ID] 的標籤（例如：『我非常推薦您閱讀《薩提爾教練模式》[BOOK:2026-05-21]，這本書提到...』），切記：[BOOK:書籍ID] 中的 ID 必須與資料庫中完全精確匹配，不能拼錯或修改。這是前端系統生成「一鍵傳送按鈕」的唯一憑證。
5. 請不要一次把所有書列出來。讀者詢問時，根據他描述的問題，挑選最精準的 1 本進行深刻的分析與推薦即可。`;

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
      console.error("Guide chat action failed:", err);
      setErrorMsg(err.message || "發生錯誤，請確認設定中的 API Key 或本地模型是否正常。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm("要重置與 AI 圖書館長的對話歷史嗎？")) {
      const initialText = language === "en-US" 
        ? "History cleared! Ask me anything about our library."
        : "對話歷史已重置！隨時告訴我您目前的挑戰或想尋求何種書籍推薦。";
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
    if (isListening) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("您的瀏覽器不支援語音輸入。");
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
    window.speechSynthesis.cancel();
    
    // Remove the special [BOOK:id] tag from speakable text
    const cleanText = text.replace(/\[BOOK:(.*?)\]/g, "");
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language;
    
    const voices = window.speechSynthesis.getVoices();
    const langVoices = voices.filter(v => v.lang.includes(language.split('-')[0]));
    
    if (langVoices.length > 0) {
      let selectedVoice = langVoices.find(v => v.name.toLowerCase().includes(aiVoice));
      if (!selectedVoice) {
        selectedVoice = langVoices[0];
      }
      utterance.voice = selectedVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  // Dynamically parses and renders [BOOK:id] tags as clickable cards
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(\[BOOK:.*?\])/g);
    
    return parts.map((part, index) => {
      const match = part.match(/\[BOOK:(.*?)\]/);
      if (match) {
        const bookId = match[1].trim();
        const book = books.find(b => b.id === bookId);
        if (book) {
          return (
            <button
              key={index}
              onClick={() => onSelectBook(bookId)}
              className="my-3 block w-full text-left p-4 bg-gradient-to-br from-[#6B705C]/15 to-[#8B8372]/5 hover:from-[#6B705C]/25 hover:to-[#8B8372]/15 border border-[#6B705C]/20 hover:border-[#6B705C]/40 rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99] group cursor-pointer shadow-3xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#6B705C] text-white flex items-center justify-center font-serif text-sm font-bold shadow-3xs select-none">
                    {book.title.slice(0, 1)}
                  </div>
                  <div>
                    <h5 className="text-xs md:text-sm font-serif font-bold text-natural-dark group-hover:text-[#6B705C] transition-colors leading-snug">
                      《{book.title}》
                    </h5>
                    <p className="text-[10px] text-natural-sand mt-0.5 leading-none">
                      作者：{book.author} • {book.category}
                    </p>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-[#6B705C] flex items-center gap-1 opacity-80 group-hover:opacity-100 font-mono tracking-wider">
                  <span>傳送閱讀</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </button>
          );
        }
        return <span key={index} className="text-natural-sand font-mono">{part}</span>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  const isLocalPending = aiEngine === "local" && !webLLM.isLoaded;

  return (
    <div id="guide-chat-box-container" className="flex flex-col h-[640px] bg-natural-bg rounded-3xl border border-natural-border shadow-2xs overflow-hidden animate-fade-in">
      
      {/* Top Header */}
      <div className="px-6 py-4.5 bg-gradient-to-r from-[#6B705C] to-[#555849] text-[#FDFCF8] flex justify-between items-center shrink-0 border-b border-natural-border/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-serif text-base font-bold shadow-3xs select-none">
            馆
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm tracking-wide flex items-center gap-1.5 text-[#FDFCF8]">
              <span>智慧 AI 圖書館長</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            </h3>
            <p className="text-[10px] text-white/70 font-mono tracking-wider uppercase">
              GLOBAL LIBRARY CURATOR • {aiEngine === "local" ? "LOCAL GPU AI" : "CLOUD GEMINI"}
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

      {/* Messages Section */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-natural-cream/60 border-b border-natural-border/30">
        {isLocalPending ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-[#6B705C]/10 flex items-center justify-center border border-[#6B705C]/20 shadow-2xs">
              <Sparkles className="w-8 h-8 text-[#6B705C] animate-pulse" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h4 className="font-serif font-bold text-[#6B705C] text-base">啟動瀏覽器本地 AI 圖書館長</h4>
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
                下載並啟動 AI 館長 (Gemma 2B)
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
                      : "bg-[#8B8372] text-white font-serif italic"
                  }`}
                >
                  {m.role === "user" ? "Me" : "館長"}
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
                    {m.role === "assistant" ? renderMessageContent(m.content) : m.content}
                    
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
                    {m.role === "user" ? (language === "en-US" ? "User" : "讀者提問") : (language === "en-US" ? "Curator" : "圖書館長")}
                  </span>
                </div>
              </div>
            ))}

            {/* Dynamic Typing indicators spinner */}
            {isLoading && (
              <div className="flex gap-3 max-w-[85%] animate-fade-in">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold bg-[#8B8372] text-white font-serif italic animate-pulse">
                  館長
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

            {/* Warning card */}
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

      {/* Suggestions Pills */}
      {messages.length <= 1 && !isLoading && !isLocalPending && (
        <div className="px-6 py-3 border-t border-natural-border bg-natural-bg shrink-0 select-none animate-fade-in">
          <p className="text-[10px] font-bold text-natural-sand flex items-center gap-1.5 mb-2 uppercase tracking-wider font-mono">
            <HelpCircle className="w-3.5 h-3.5 text-natural-sand" />
            {language === "en-US" ? "Try asking:" : "您可以跟館長聊聊您的困惑："}
          </p>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {[
              language === "en-US" ? "I struggle with public speaking and presentation." : "我上台簡報或跟客戶報告時，很容易講得很枯燥，有推薦的書嗎？",
              language === "en-US" ? "How can I handle conflicts with colleagues?" : "我是主管，團隊有員工最近常推卸責任，該怎麼激發他的主動性？",
              language === "en-US" ? "Suggest something to improve leadership." : "我想在日常溝通中建立領導力，能推薦我實用的伴讀書籍嗎？"
            ].map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(suggestion)}
                className="text-xs bg-natural-warm text-natural-dark hover:text-white border border-natural-border hover:bg-[#6B705C] hover:border-[#6B705C] rounded-full px-3.5 py-1.5 transition-all text-left truncate max-w-full inline-flex items-center gap-1.5 shadow-3xs cursor-pointer"
              >
                <span>{suggestion}</span>
                <ArrowRight className="w-3.5 h-3.5 text-natural-sand shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Text bar */}
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
              ? (language === "en-US" ? "Please start Local AI Curator first..." : "請先啟動本地 AI 圖書館長...") 
              : (language === "en-US" ? "Tell AI Curator about your thoughts..." : "向智慧圖書館長訴說您目前的學習瓶頸或想找什麼書...")
          }
          disabled={isLoading || isListening || isLocalPending}
          className={`flex-1 bg-natural-warm border border-natural-border focus:border-natural-sage focus:bg-natural-bg rounded-xl px-4 py-3 ${fontSizeClass} text-natural-dark placeholder-natural-sand focus:outline-none focus:ring-1 focus:ring-natural-sage disabled:opacity-50 transition-all font-sans`}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading || isLocalPending}
          className="p-3 bg-[#6B705C] hover:bg-[#555849] text-white rounded-xl shadow-xs disabled:bg-natural-warm disabled:text-natural-sand transition-colors cursor-pointer shrink-0 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
