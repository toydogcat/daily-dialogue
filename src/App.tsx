import React, { useState, useEffect } from "react";
import BookCard from "./components/BookCard";
import ChatBox from "./components/ChatBox";
import BlogView from "./components/BlogView";
import { Book, booksData } from "./booksData";
import { BookOpen, Sparkles, MessageSquare, ListFilter, ArrowLeft, Search, Calendar, ChevronRight, Settings, X } from "lucide-react";
import { useWebLLM } from "./hooks/useWebLLM";

export default function App() {
  // Application State
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [bookDetail, setBookDetail] = useState<Book | null>(null);
  const [activeMode, setActiveMode] = useState<"chat" | "blog">("chat");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [language, setLanguage] = useState<"zh-TW" | "en-US">("zh-TW");
  const [aiVoice, setAiVoice] = useState<"male" | "female">("female");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");

  const [geminiKey, setGeminiKey] = useState<string>(() => localStorage.getItem("gemini_api_key") || "");

  useEffect(() => {
    localStorage.setItem("gemini_api_key", geminiKey);
  }, [geminiKey]);

  const [aiEngine, setAiEngine] = useState<"gemini" | "local">(() => {
    return (localStorage.getItem("daily_dialogue_ai_engine") as "gemini" | "local") || "gemini";
  });

  useEffect(() => {
    localStorage.setItem("daily_dialogue_ai_engine", aiEngine);
  }, [aiEngine]);

  const webLLM = useWebLLM();

  // Sync dark mode
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Load books overview on mount
  useEffect(() => {
    setBooks(booksData);
    setLoadingList(false);
  }, []);

  // Handle entering a specific day / book detail page
  const handleSelectBook = (id: string, initialMode: "chat" | "blog" = "chat") => {
    setSelectedBookId(id);
    setActiveMode(initialMode);
    setLoadingDetail(true);

    const foundBook = booksData.find((b) => b.id === id);
    if (foundBook) {
      setBookDetail(foundBook);
    } else {
      console.error(`Fetch book details failed: Book with id ${id} not found in static data`);
    }
    setLoadingDetail(false);
  };

  // Back to overview board
  const handleBackToOverview = () => {
    setSelectedBookId(null);
    setBookDetail(null);
  };

  // Filter books by searchQuery
  const filteredBooks = books.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q) ||
      b.date.includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-natural-bg text-natural-dark font-sans flex flex-col justify-between">
      
      {/* 🚀 Top Global Navigation Banner */}
      <header className="sticky top-0 bg-natural-bg/90 backdrop-blur-md border-b border-natural-border py-4 px-6 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          {/* Main Logo & Title */}
          <div
            onClick={handleBackToOverview}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="bg-[#6B705C] text-[#FDFCF8] p-2.5 rounded-xl group-hover:scale-105 transition-transform shadow-3xs">
              <BookOpen className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-base tracking-wide text-natural-dark flex items-center gap-2">
                每天對話一本書
                <span className="text-[10px] bg-natural-warm text-natural-sage-dark border border-natural-border font-bold px-2 py-0.5 rounded font-mono">
                  Daily Dialogue
                </span>
              </h1>
              <p className="text-[10px] text-natural-sand tracking-widest font-serif italic">穿透表象 • 啟發思維 • 落實生活</p>
            </div>
          </div>

          {/* Quick Stats or status representation */}
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 bg-natural-warm text-natural-dark hover:bg-[#6B705C] hover:text-[#FDFCF8] rounded-full transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <span className="text-[11px] text-natural-sand font-mono hidden sm:inline tracking-wider uppercase bg-natural-warm/60 px-3 py-1 rounded-full border border-natural-border/40">
              {new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>

        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-natural-bg rounded-3xl border border-natural-border p-8 w-full max-w-md shadow-2xs relative">
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 p-2 hover:bg-natural-warm rounded-full text-natural-sand">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-serif font-bold text-natural-dark mb-6">系統設定 Settings</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-natural-dark">AI 運算引擎 (AI Engine)</span>
                <select value={aiEngine} onChange={e => setAiEngine(e.target.value as any)} className="bg-natural-warm border border-natural-border rounded-lg px-3 py-1 text-sm text-natural-dark outline-none focus:ring-1 focus:ring-[#6B705C]">
                  <option value="gemini">雲端 Gemini API (極速)</option>
                  <option value="local">瀏覽器本地 WebGPU (離線/隱私)</option>
                </select>
              </div>
              {aiEngine === "local" && (
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-natural-border text-[11px] text-[#8B8372] leading-relaxed animate-fade-in">
                  <p className="font-bold text-natural-dark mb-1">💡 本地 AI (Gemma 2B) 運作提示</p>
                  <p>本地引擎完全運行在您的瀏覽器與 GPU 中，不消耗任何網路金鑰，100% 離線隱私安全。首次使用將會在對話視窗下載模型權重（約 1.4GB），下載後即可永久快速離線使用！</p>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-natural-dark">主題模式 (Theme)</span>
                <select value={theme} onChange={e => setTheme(e.target.value as any)} className="bg-natural-warm border border-natural-border rounded-lg px-3 py-1 text-sm text-natural-dark outline-none focus:ring-1 focus:ring-[#6B705C]">
                  <option value="light">白天 (Light)</option>
                  <option value="dark">晚上 (Dark)</option>
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-natural-dark">介面語言 (Language)</span>
                <select value={language} onChange={e => setLanguage(e.target.value as any)} className="bg-natural-warm border border-natural-border rounded-lg px-3 py-1 text-sm text-natural-dark outline-none focus:ring-1 focus:ring-[#6B705C]">
                  <option value="zh-TW">繁體中文 (Chinese)</option>
                  <option value="en-US">英文 (English)</option>
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-natural-dark">AI 教練聲音 (Voice)</span>
                <select value={aiVoice} onChange={e => setAiVoice(e.target.value as any)} className="bg-natural-warm border border-natural-border rounded-lg px-3 py-1 text-sm text-natural-dark outline-none focus:ring-1 focus:ring-[#6B705C]">
                  <option value="female">女性 (Female)</option>
                  <option value="male">男性 (Male)</option>
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-natural-dark">字體大小 (Font Size)</span>
                <select value={fontSize} onChange={e => setFontSize(e.target.value as any)} className="bg-natural-warm border border-natural-border rounded-lg px-3 py-1 text-sm text-natural-dark outline-none focus:ring-1 focus:ring-[#6B705C]">
                  <option value="small">小 (Small)</option>
                  <option value="medium">適中 (Medium)</option>
                  <option value="large">大 (Large)</option>
                </select>
              </div>
              {aiEngine === "gemini" && (
                <div className="pt-4 border-t border-natural-border mt-4 animate-fade-in">
                  <label className="block text-sm font-medium text-natural-dark mb-2">Gemini API Key</label>
                  <input 
                    type="password" 
                    value={geminiKey} 
                    onChange={e => setGeminiKey(e.target.value)} 
                    placeholder="AI 對話必須填寫 (儲存於本地)"
                    className="w-full bg-natural-warm border border-natural-border rounded-lg px-3 py-2 text-sm text-natural-dark outline-none focus:ring-1 focus:ring-[#6B705C] placeholder:text-natural-sand"
                  />
                  <p className="text-[10px] text-natural-sand mt-1">金鑰僅會儲存在您的瀏覽器中，不會上傳到任何伺服器。</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔮 Center Main Hub Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* ======================================= */}
        {/* VIEW 1: Books Shelf Grid (Overview Page) */}
        {/* ======================================= */}
        {!selectedBookId ? (
          <div className="space-y-8 animate-fade-in" id="overview-view">
            
            {/* Visual Intro Banner */}
            <div className="bg-natural-cream rounded-3xl border border-natural-border p-8 md:p-10 shadow-2xs relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="space-y-4 max-w-2xl relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-natural-bg border border-natural-border text-natural-sage text-xs font-semibold font-mono tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  高效學習 • 雙軌解密
                </div>
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-natural-dark tracking-normal leading-tight">
                  不只是閱讀，<span className="text-[#6B705C] italic font-medium">用對話</span>吸乾一本書的精華
                </h2>
                <p className="text-natural-sand text-sm md:text-base leading-relaxed">
                  每天精選一本職場、領導或表達好書。我們提供 <strong className="text-natural-dark">Blog 模式</strong> 供您快覽大綱大架構；更特別提供 <strong className="text-natural-dark">對話模式</strong>，餵書內容給 AI 教練，讓您用聊的、用問的快速破關落實！
                </p>
              </div>

              {/* Graphic container */}
              <div className="shrink-0 flex gap-4 relative select-none z-10">
                <div className="w-24 h-32 rounded-xl bg-gradient-to-br from-[#6B705C] to-[#5A5A40] shadow-xs transform -rotate-6 translate-x-2 border-r-4 border-white/20 flex items-center justify-center text-white text-[10px] font-serif font-medium p-3.5 text-center">
                  薩提爾教練
                </div>
                <div className="w-24 h-32 rounded-xl bg-gradient-to-br from-[#8B8372] to-[#6A6251] shadow-xs transform rotate-6 border-r-4 border-white/20 flex items-center justify-center text-white text-[10px] font-serif font-medium p-3.5 text-center">
                  說故事巧實力
                </div>
              </div>
            </div>

            {/* Tool search & Filter bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-natural-bg p-4 rounded-2xl border border-natural-border shadow-3xs">
              <div className="relative w-full sm:max-w-md">
                <Search className="w-4 h-4 text-natural-sand absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜尋書名、作者、章節觀點或日期..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#FBF9F5] border border-natural-border hover:border-natural-sand-light focus:bg-natural-bg focus:border-[#6B705C] focus:ring-[#6B705C] rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm outline-none transition-all placeholder:text-natural-sand text-natural-dark"
                />
              </div>

              <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-natural-sand uppercase tracking-wider self-end sm:self-auto shrink-0">
                <ListFilter className="w-3.5 h-3.5" />
                <span>顯示：{filteredBooks.length} 本精選書目</span>
              </div>
            </div>

            {/* List of Books Cards */}
            {loadingList ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-12">
                {[1, 2].map((n) => (
                  <div key={n} className="bg-natural-bg rounded-2xl border border-natural-border p-8 space-y-4 animate-pulse h-80">
                    <div className="h-6 w-1/3 bg-[#F5F2ED] rounded" />
                    <div className="h-10 w-2/3 bg-[#F5F2ED] rounded" />
                    <div className="h-20 bg-[#F9F7F2]/60 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredBooks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onSelect={handleSelectBook}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-natural-bg rounded-3xl border border-dashed border-natural-border space-y-4">
                <p className="text-natural-sand text-sm font-serif">找不到符合搜尋條件的每日書目...</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-[#6B705C] font-bold underline cursor-pointer"
                >
                  清除清除搜尋
                </button>
              </div>
            )}

          </div>
        ) : (
          
          // ===========================================
          // VIEW 2: Single Book Study (Daily Page View)
          // ===========================================
          <div className="space-y-6" id="daily-view">
            
            {/* Context Back and Swapping Controls Header */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-natural-bg p-4.5 rounded-2xl border border-natural-border shadow-3xs">
              
              {/* Back Command */}
              <button
                onClick={handleBackToOverview}
                className="flex items-center gap-2 hover:gap-2.5 text-xs font-serif font-bold text-natural-sand hover:text-natural-dark transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                返回總覽大廳
              </button>

              {/* Title representation */}
              {bookDetail && (
                <div className="hidden md:flex items-center gap-2 text-xs font-mono font-semibold max-w-xs truncate text-natural-dark">
                  <span className="text-[#6B705C] font-bold bg-natural-warm border border-natural-border/60 px-2 py-0.5 rounded shrink-0">
                    {bookDetail.date.replace(/-/g, "/")}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-natural-sand shrink-0" />
                  <span className="text-natural-sand truncate font-serif font-medium">{bookDetail.title}</span>
                </div>
              )}

              {/* Segmented Dual Mode Swapper (Dialogue vs Blog) */}
              <div className="bg-natural-warm/80 border border-natural-border p-1 rounded-xl flex w-full sm:w-auto shrink-0 select-none">
                <button
                  id="tab-dialogue"
                  onClick={() => setActiveMode("chat")}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeMode === "chat"
                      ? "bg-[#6B705C] text-[#FDFCF8] shadow-3xs"
                      : "text-natural-sand hover:text-natural-dark"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  對話模式
                </button>
                <button
                  id="tab-blog"
                  onClick={() => setActiveMode("blog")}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeMode === "blog"
                      ? "bg-[#6B705C] text-[#FDFCF8] shadow-3xs"
                      : "text-natural-sand hover:text-natural-dark"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Blog 模式
                </button>
              </div>

            </div>

            {/* Active Mode Render container */}
            {loadingDetail ? (
              <div className="bg-natural-bg rounded-3xl border border-natural-border p-16 flex flex-col justify-center items-center gap-4 animate-pulse">
                <div className="w-10 h-10 border-4 border-[#6B705C] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-serif text-natural-sand">正在精心解密當天書籍架構與教練配置...</p>
              </div>
            ) : bookDetail ? (
              <div>
                {activeMode === "chat" ? (
                  <ChatBox 
                    book={bookDetail} 
                    language={language}
                    aiVoice={aiVoice}
                    fontSize={fontSize}
                    geminiKey={geminiKey}
                    aiEngine={aiEngine}
                    webLLM={webLLM}
                  />
                ) : (
                  <BlogView book={bookDetail} />
                )}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-natural-border space-y-4">
                <p className="text-natural-sand text-sm font-serif">未能成功調用書本詳細結構，可能正因連線阻礙...</p>
                <button
                  onClick={handleBackToOverview}
                  className="px-4 py-2 bg-[#6B705C] hover:bg-[#5A5A40] text-white rounded-xl text-xs font-bold font-serif transition-colors cursor-pointer"
                >
                  返回主頁面
                </button>
              </div>
            )}

          </div>
        )}

      </main>

      {/* 🏡 Bottom Footer design */}
      <footer className="bg-natural-bg/50 border-t border-natural-border py-6 px-4 shrink-0 text-center text-xs text-natural-sand font-serif">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 每天對話一本書 • AI Studio Live Workshop</p>
          <div className="flex gap-4">
            <span className="cursor-default hover:text-[#6B705C] transition-colors">繁體中文版</span>
            <span>•</span>
            <span className="cursor-default hover:text-[#6B705C] transition-colors">極速對答機制</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
