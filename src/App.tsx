import React, { useState, useEffect } from "react";
import BookCard from "./components/BookCard";
import ChatBox from "./components/ChatBox";
import BlogView from "./components/BlogView";
import GuideChatBox from "./components/GuideChatBox";
import { Book, BookMetadata, booksData, loadBookDetail } from "./booksData";
import { BookOpen, Sparkles, MessageSquare, ListFilter, ArrowLeft, Search, ChevronRight, Settings, X, Eye, Users } from "lucide-react";
import { useWebLLM } from "./hooks/useWebLLM";

export default function App() {
  // Application State
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
  const [showFutureBooks, setShowFutureBooks] = useState<boolean>(() => {
    return localStorage.getItem("daily_dialogue_show_future_books") === "true";
  });
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(12);
  const [visitorStats, setVisitorStats] = useState<{ sitePv: number; siteUv: number } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const host = window.location.host || "unknown-host";
        const cookieName = `vercount_uv_${host.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
        
        const hasCookie = document.cookie.split("; ").some(item => item.startsWith(`${cookieName}=`));
        const isNewUv = !hasCookie;
        
        if (isNewUv) {
          document.cookie = `${cookieName}=1; path=/; max-age=31536000; samesite=lax`;
        }

        const response = await fetch("https://events.vercount.one/api/v2/log", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            url: window.location.href,
            isNewUv: isNewUv
          })
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.status === "success" && resData.data) {
            setVisitorStats({
              sitePv: resData.data.site_pv || 0,
              siteUv: resData.data.site_uv || 0
            });
            localStorage.setItem("daily_dialogue_visitor_stats", JSON.stringify({
              sitePv: resData.data.site_pv || 0,
              siteUv: resData.data.site_uv || 0
            }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch visitor stats:", err);
        const saved = localStorage.getItem("daily_dialogue_visitor_stats");
        if (saved) {
          try {
            setVisitorStats(JSON.parse(saved));
          } catch (_) {}
        }
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    localStorage.setItem("daily_dialogue_show_future_books", String(showFutureBooks));
  }, [showFutureBooks]);

  // Reset pagination when filter/search changes
  useEffect(() => {
    setVisibleCount(12);
  }, [searchQuery, selectedTag, showFutureBooks]);

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

  const [defaultHomeStyle, setDefaultHomeStyle] = useState<"blog" | "guide">(() => {
    return (localStorage.getItem("daily_dialogue_default_home_style") as "blog" | "guide") || "blog";
  });

  useEffect(() => {
    localStorage.setItem("daily_dialogue_default_home_style", defaultHomeStyle);
  }, [defaultHomeStyle]);

  const [activeOverviewTab, setActiveOverviewTab] = useState<"blog" | "guide">(defaultHomeStyle);

  // Sync active overview tab when user changes the default style in settings
  useEffect(() => {
    setActiveOverviewTab(defaultHomeStyle);
  }, [defaultHomeStyle]);

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
    setLoadingList(false);
  }, []);

  // Post scroll events to parent window for dynamic header collapsing
  useEffect(() => {
    let lastScrollY = 0;
    const scrollThreshold = 8;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      if (Math.abs(currentScrollY - lastScrollY) < scrollThreshold && currentScrollY > 10) return;
      
      const direction = currentScrollY > lastScrollY ? 'down' : 'up';
      window.parent.postMessage({
        type: 'iframe_scroll',
        scrollY: currentScrollY,
        direction: direction
      }, '*');
      lastScrollY = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter books by date and showFutureBooks, and sort descending
  const processedBooks = React.useMemo(() => {
    const todayStr = new Date(Date.now() + 8 * 3600000).toISOString().split('T')[0];
    return booksData
      .filter((b) => {
        if (showFutureBooks) return true;
        return b.date <= todayStr;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [showFutureBooks]);

  // Compute all unique tags from processedBooks
  const allTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    processedBooks.forEach((b) => {
      if (b.tags) {
        b.tags.forEach((t) => tagsSet.add(t));
      }
    });
    return Array.from(tagsSet);
  }, [processedBooks]);

  // Filter books by selectedTag and searchQuery
  const filteredBooks = React.useMemo(() => {
    return processedBooks.filter((b) => {
      const matchesTag = !selectedTag || (b.tags && b.tags.includes(selectedTag));
      
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.date.includes(q);
        
      return matchesTag && matchesSearch;
    });
  }, [processedBooks, selectedTag, searchQuery]);

  // Handle entering a specific day / book detail page
  const handleSelectBook = async (id: string, initialMode: "chat" | "blog" = "chat") => {
    setSelectedBookId(id);
    setActiveMode(initialMode);
    setLoadingDetail(true);

    try {
      const detailedBook = await loadBookDetail(id);
      setBookDetail(detailedBook);
    } catch (err) {
      console.error(`Fetch book details failed:`, err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Back to overview board
  const handleBackToOverview = () => {
    setSelectedBookId(null);
    setBookDetail(null);
  };

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
                <div className="p-3 bg-natural-warm rounded-xl border border-natural-border text-[11px] text-[#8B8372] leading-relaxed animate-fade-in">
                  <p className="font-bold text-natural-dark mb-1">💡 本地 AI (Gemma 2B) 運作提示</p>
                  <p>本地引擎完全運行在您的瀏覽器與 GPU 中，不消耗 any 網路金鑰，100% 離線隱私安全。首次使用將會在對話視窗下載模型權重（約 1.4GB），下載後即可永久快速離線使用！</p>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-natural-dark">預設首頁風格 (Default Home)</span>
                <select value={defaultHomeStyle} onChange={e => setDefaultHomeStyle(e.target.value as any)} className="bg-natural-warm border border-natural-border rounded-lg px-3 py-1 text-sm text-natural-dark outline-none focus:ring-1 focus:ring-[#6B705C]">
                  <option value="blog">部落格書庫風 (Blog Cards)</option>
                  <option value="guide">智慧 AI 館長導讀 (AI Curator)</option>
                </select>
              </div>
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
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-natural-dark font-serif">顯示未來書籍 (Show Future)</span>
                <button
                  type="button"
                  onClick={() => setShowFutureBooks(!showFutureBooks)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showFutureBooks ? "bg-[#6B705C]" : "bg-natural-warm border border-natural-border"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      showFutureBooks ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
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
                  每天精選一本職場、領導或表達好書。我們提供 <strong className="text-natural-dark">Blog 模式</strong> 供您快覽大綱大架構；更特別提供 <strong className="text-natural-dark">對話模式</strong>，餵書內容給 AI 教練，讓您用聊的、用問的快速落實！
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

            {/* Overview View Tabs Controller */}
            <div className="flex justify-center select-none animate-fade-in">
              <div className="bg-natural-warm/80 border border-natural-border p-1 rounded-2xl flex shadow-3xs">
                <button
                  onClick={() => setActiveOverviewTab("blog")}
                  className={`flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeOverviewTab === "blog"
                      ? "bg-[#6B705C] text-[#FDFCF8] shadow-3xs scale-105"
                      : "text-natural-sand hover:text-natural-dark"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  部落格書庫風
                </button>
                <button
                  onClick={() => setActiveOverviewTab("guide")}
                  className={`flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeOverviewTab === "guide"
                      ? "bg-[#6B705C] text-[#FDFCF8] shadow-3xs scale-105"
                      : "text-natural-sand hover:text-natural-dark"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  智慧 AI 圖書館長
                </button>
              </div>
            </div>

            {activeOverviewTab === "blog" ? (
              <div className="space-y-8 animate-fade-in">
                {/* Tool search & Filter bar */}
                <div className="flex flex-col gap-4 bg-natural-bg p-4 rounded-2xl border border-natural-border shadow-3xs">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:max-w-md">
                      <Search className="w-4 h-4 text-natural-sand absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="搜尋書名、作者、章節觀點或日期..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-natural-warm border border-natural-border hover:border-natural-sand-light focus:bg-natural-bg focus:border-[#6B705C] focus:ring-[#6B705C] rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm outline-none transition-all placeholder:text-natural-sand text-natural-dark"
                      />
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-natural-sand uppercase tracking-wider self-end sm:self-auto shrink-0">
                      <ListFilter className="w-3.5 h-3.5" />
                      <span>顯示：{filteredBooks.length} 本精選書目</span>
                    </div>
                  </div>

                  {/* Horizontal Tags Filter */}
                  {allTags.length > 0 && (
                    <div className="flex items-center gap-2 border-t border-natural-border/40 pt-3 overflow-x-auto no-scrollbar scroll-smooth">
                      <span className="text-[10px] font-bold text-natural-sand font-mono uppercase tracking-wider shrink-0">主題標籤:</span>
                      <div className="flex gap-1.5 items-center overflow-x-auto no-scrollbar">
                        <button
                          onClick={() => setSelectedTag(null)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                            !selectedTag
                              ? "bg-[#6B705C] text-[#FDFCF8] border-[#6B705C]"
                              : "bg-natural-warm text-natural-sand border-natural-border hover:text-natural-dark hover:border-natural-sand-light"
                          }`}
                        >
                          全部
                        </button>
                        {allTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                              tag === selectedTag
                                ? "bg-[#6B705C] text-[#FDFCF8] border-[#6B705C]"
                                : "bg-natural-warm text-natural-sand border-natural-border hover:text-natural-dark hover:border-natural-sand-light"
                            }`}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {filteredBooks.slice(0, visibleCount).map((book) => (
                        <BookCard
                          key={book.id}
                          book={book}
                          onSelect={handleSelectBook}
                        />
                      ))}
                    </div>
                    
                    {filteredBooks.length > visibleCount && (
                      <div className="flex justify-center pt-4">
                        <button
                          id="btn-load-more"
                          onClick={() => setVisibleCount((prev) => prev + 12)}
                          className="px-6 py-3 bg-natural-warm hover:bg-[#EAE6DF] text-natural-dark font-serif font-bold text-xs rounded-xl border border-natural-border hover:border-natural-sand-light shadow-3xs transition-all duration-300 hover:scale-[1.02] cursor-pointer flex items-center gap-2"
                        >
                          載入更多每日好書
                          <span className="bg-[#6B705C] text-[#FDFCF8] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                            {filteredBooks.length - visibleCount}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-natural-bg rounded-3xl border border-dashed border-natural-border space-y-4">
                    <p className="text-natural-sand text-sm font-serif">找不到符合搜尋條件的每日書目...</p>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedTag(null);
                      }}
                      className="text-xs text-[#6B705C] font-bold underline cursor-pointer"
                    >
                      清除篩選與搜尋
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-fade-in max-w-4xl mx-auto w-full">
                <GuideChatBox
                  books={processedBooks}
                  language={language}
                  aiVoice={aiVoice}
                  fontSize={fontSize}
                  geminiKey={geminiKey}
                  aiEngine={aiEngine}
                  webLLM={webLLM}
                  onSelectBook={handleSelectBook}
                />
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
              <div className="text-center py-20 bg-natural-bg rounded-3xl border border-natural-border space-y-4">
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
          <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1">
            {visitorStats && (
              <>
                <span className="flex items-center gap-1 cursor-default hover:text-[#6B705C] transition-colors">
                  <Eye className="w-3 h-3 text-[#6B705C]/75" />
                  總瀏覽 <span className="font-sans font-bold text-natural-sand/90">{visitorStats.sitePv}</span> 次
                </span>
                <span className="text-natural-border/60">•</span>
                <span className="flex items-center gap-1 cursor-default hover:text-[#6B705C] transition-colors">
                  <Users className="w-3 h-3 text-[#6B705C]/75" />
                  訪客 <span className="font-sans font-bold text-natural-sand/90">{visitorStats.siteUv}</span> 人
                </span>
                <span className="text-natural-border/60">•</span>
              </>
            )}
            <span className="cursor-default hover:text-[#6B705C] transition-colors">繁體中文版</span>
            <span>•</span>
            <span className="cursor-default hover:text-[#6B705C] transition-colors">極速對答機制</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
