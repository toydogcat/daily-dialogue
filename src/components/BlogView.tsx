import React, { useState, useEffect, useRef } from "react";
import { Book } from "../booksData";
import { 
  BookOpen, Award, Users, Compass, Quote, ChevronRight, Check,
  Play, Pause, Square, SkipForward, SkipBack, Volume2, Loader2 
} from "lucide-react";

interface BlogViewProps {
  book: Book;
}

interface SpeechNode {
  id: string;
  text: string;
  label: string;
  elementId?: string;
}

export default function BlogView({ book }: BlogViewProps) {
  const [activeConceptIdx, setActiveConceptIdx] = useState<number | null>(0);

  // --- Puter.js Sequential TTS Player State & Logic ---
  const [speechNodes, setSpeechNodes] = useState<SpeechNode[]>([]);
  const [currentSpeechIdx, setCurrentSpeechIdx] = useState<number | null>(null);
  const [isSpeechPlaying, setIsSpeechPlaying] = useState(false);
  const [isSpeechLoading, setIsSpeechLoading] = useState(false);
  const [audioEngine, setAudioEngine] = useState<'google' | 'native'>(() => {
    return (localStorage.getItem('audio_engine') as 'google' | 'native') || 'google';
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentIdxRef = useRef<number | null>(null);
  const isNativeTTSRef = useRef<boolean>(false);

  useEffect(() => {
    currentIdxRef.current = currentSpeechIdx;
  }, [currentSpeechIdx]);

  // Load voices on mount for SpeechSynthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // Construct Speech Nodes for the current Book
  useEffect(() => {
    const nodes: SpeechNode[] = [];
    
    // 1. Introduction
    nodes.push({
      id: "intro",
      text: `今天為您導讀的作品是《${book.title}》，作者是 ${book.author}。這是一部關於 ${book.category} 的深度研究。${book.description}`,
      label: "書籍簡介",
      elementId: "blog-header"
    });

    // 2. Core Takeaway & Quote
    nodes.push({
      id: "takeaway",
      text: `本書的最核心金句是：「${book.quote}」。全書的核心精華可以總結為：${book.coreTakeaway}`,
      label: "核心精華",
      elementId: "blog-takeaway"
    });

    // 3. Concepts
    book.concepts.forEach((con, idx) => {
      nodes.push({
        id: `concept-${idx}`,
        text: `深度觀點第 ${idx + 1} 點：${con.title}。${con.description}。詳細剖析是：${con.extendedContent}`,
        label: `深度觀點 ${idx + 1}`,
        elementId: `concept-card-${idx}`
      });
    });

    // 4. Chapters Intro
    nodes.push({
      id: "chapters-intro",
      text: "接下來為您梳理這本書的章節大綱。",
      label: "章節引言",
      elementId: "blog-chapters-title"
    });

    // Chapter items
    book.chapters.forEach((ch, idx) => {
      nodes.push({
        id: `chapter-${idx}`,
        text: `第 ${idx + 1} 章：${ch.title.split("：")[1] || ch.title}。大綱摘要：${ch.summary}`,
        label: `章節大綱 ${idx + 1}`,
        elementId: `chapter-row-${idx}`
      });
    });

    // 5. Excerpts
    if (book.excerpts && book.excerpts.length > 0) {
      nodes.push({
        id: "excerpts-intro",
        text: "以下是這本書的七大精華節錄，一同感受這本書的筆觸與溫度。",
        label: "節錄引言",
        elementId: "blog-excerpts-title"
      });

      book.excerpts.forEach((excerpt, idx) => {
        nodes.push({
          id: `excerpt-${idx}`,
          text: `精華節錄第 ${idx + 1} 段：「${excerpt}」`,
          label: `精華節錄 ${idx + 1}`,
          elementId: `excerpt-card-${idx}`
        });
      });
    }

    // 6. Practical Guide
    nodes.push({
      id: "guide",
      text: `最後，這本書最適合推薦給：${book.targetAudience.join("，以及") || "所有熱愛閱讀的讀者"}。如何落實的自主學習指南是：${book.readingGuide}`,
      label: "實踐指南",
      elementId: "blog-guide-title"
    });

    setSpeechNodes(nodes);
    
    // Cleanup audio on book change
    return () => {
      stopSpeech();
    };
  }, [book]);

  const playWithGoogleTTS = (text: string, index: number) => {
    isNativeTTSRef.current = false;

    // Clean text: remove emojis, convert parentheses to commas for natural pauses
    const cleanText = text
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "")
      .replace(/[\(\)（）【】]/g, "，");

    // Split text into readable chunks under 150 chars (Google Translate URL limit is 200)
    // We split by punctuation to maintain natural phrase boundaries
    const parts = cleanText.split(/([，。？！；])/).reduce((acc: string[], cur: string) => {
      if (acc.length === 0) {
        acc.push(cur);
      } else {
        const lastIdx = acc.length - 1;
        if (acc[lastIdx].length + cur.length < 150) {
          acc[lastIdx] += cur;
        } else {
          acc.push(cur);
        }
      }
      return acc;
    }, []).filter(s => s.trim().length > 0);

    let partIdx = 0;
    
    const playNextPart = () => {
      if (currentIdxRef.current !== index) return;

      if (partIdx >= parts.length) {
        // Finished current speech node, move to next
        const nextIdx = index + 1;
        if (nextIdx < speechNodes.length) {
          playNode(nextIdx);
        } else {
          stopSpeech();
        }
        return;
      }

      const sentence = parts[partIdx];
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-TW&client=tw-ob&q=${encodeURIComponent(sentence)}`;
      
      const audio = new Audio(url);
      audioRef.current = audio;
      setIsSpeechLoading(false);
      setIsSpeechPlaying(true);

      audio.onended = () => {
        partIdx++;
        playNextPart();
      };

      audio.onerror = (e) => {
        console.warn("Google TTS part failed, falling back to next part...", e);
        partIdx++;
        playNextPart();
      };

      audio.play().catch(err => {
        console.error("Audio playback blocked or failed:", err);
        setIsSpeechLoading(false);
        setIsSpeechPlaying(false);
      });
    };

    setIsSpeechLoading(true);
    playNextPart();
  };

  const playWithNativeTTS = (text: string, index: number) => {
    isNativeTTSRef.current = true;

    // Clean text: remove emojis, convert parentheses to commas for natural pauses
    const cleanText = text
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "")
      .replace(/[\(\)（）【】]/g, "，");

    // Detect language: check if text has Chinese characters
    const isChinese = /[\u4e00-\u9fa5]/.test(cleanText);
    const lang = isChinese ? "zh-TW" : "en-US";

    // Split text into readable chunks under 100 chars to avoid Chrome's 15s freeze bug
    const parts = cleanText.split(/([，。？！；：,.\?!;:])/).reduce((acc: string[], cur: string) => {
      if (acc.length === 0) {
        acc.push(cur);
      } else {
        const lastIdx = acc.length - 1;
        if (acc[lastIdx].length + cur.length < 100) {
          acc[lastIdx] += cur;
        } else {
          acc.push(cur);
        }
      }
      return acc;
    }, []).filter(s => s.trim().length > 0);

    let partIdx = 0;
    
    const playNextPart = () => {
      if (currentIdxRef.current !== index) return;

      if (partIdx >= parts.length) {
        // Finished current speech node, move to next
        const nextIdx = index + 1;
        if (nextIdx < speechNodes.length) {
          playNode(nextIdx);
        } else {
          stopSpeech();
        }
        return;
      }

      const sentence = parts[partIdx];
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = lang;

      // Voice selection logic based on language
      const voices = window.speechSynthesis.getVoices();
      const langVoices = voices.filter(v => v.lang.includes(lang.split('-')[0]));
      
      if (langVoices.length > 0) {
        // Look for standard high quality voices or default local voices
        let selectedVoice = langVoices.find(v => v.name.includes("Google") || v.name.includes("Microsoft") || v.localService);
        if (!selectedVoice) {
          selectedVoice = langVoices[0];
        }
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => {
        partIdx++;
        playNextPart();
      };

      utterance.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') {
          console.log("Native TTS playback cancelled or interrupted.");
          return;
        }
        console.warn("Native TTS part failed, falling back to next part...", e);
        partIdx++;
        playNextPart();
      };

      setIsSpeechLoading(false);
      setIsSpeechPlaying(true);
      window.speechSynthesis.speak(utterance);
    };

    setIsSpeechLoading(true);
    playNextPart();
  };

  const handleEngineChange = (engine: 'google' | 'native') => {
    setAudioEngine(engine);
    localStorage.setItem('audio_engine', engine);
    
    if (currentIdxRef.current !== null) {
      const activeIdx = currentIdxRef.current;
      const wasPlaying = isSpeechPlaying;
      stopSpeech();
      
      if (wasPlaying) {
        setTimeout(() => {
          playNode(activeIdx, engine);
        }, 150);
      }
    }
  };

  const playNode = async (index: number, forceEngine?: 'google' | 'native') => {
    if (index < 0 || index >= speechNodes.length) {
      stopSpeech();
      return;
    }

    try {
      setIsSpeechLoading(true);
      setCurrentSpeechIdx(index);
      setIsSpeechPlaying(true);

      // Stop current playback engines
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      isNativeTTSRef.current = false;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }

      const node = speechNodes[index];
      
      // Dynamic scrolling & UI focus
      if (node.elementId) {
        if (node.id.startsWith("concept-")) {
          const conceptIndex = parseInt(node.id.split("-")[1], 10);
          setActiveConceptIdx(conceptIndex);
        }
        
        const el = document.getElementById(node.elementId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }

      // Play with the selected engine
      const engineToUse = forceEngine || audioEngine;
      if (engineToUse === 'native' && window.speechSynthesis) {
        playWithNativeTTS(node.text, index);
      } else {
        playWithGoogleTTS(node.text, index);
      }
    } catch (err) {
      console.error("Speech playback error:", err);
      stopSpeech();
    }
  };

  const togglePlaySpeech = () => {
    if (currentSpeechIdx === null) {
      playNode(0);
    } else if (isSpeechPlaying) {
      if (isNativeTTSRef.current) {
        if (window.speechSynthesis) {
          window.speechSynthesis.pause();
        }
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsSpeechPlaying(false);
    } else {
      if (isNativeTTSRef.current) {
        if (window.speechSynthesis) {
          window.speechSynthesis.resume();
        }
      } else if (audioRef.current) {
        audioRef.current.play().catch(e => console.error("Resume failed:", e));
      }
      setIsSpeechPlaying(true);
    }
  };

  const stopSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setCurrentSpeechIdx(null);
    setIsSpeechPlaying(false);
    setIsSpeechLoading(false);
  };

  const nextSpeech = () => {
    const cur = currentIdxRef.current;
    if (cur !== null && cur + 1 < speechNodes.length) {
      playNode(cur + 1);
    }
  };

  const prevSpeech = () => {
    const cur = currentIdxRef.current;
    if (cur !== null && cur - 1 >= 0) {
      playNode(cur - 1);
    }
  };

  // Helper theme bg for spine representation matching Natural Tones code-level aesthetics
  const getNaturalHeaderBg = () => {
    if (book.id === "2026-05-21") {
      return "from-[#6B705C] to-[#5A5A40]";
    }
    return "from-[#8B8372] to-[#6A6251]";
  };

  // Determine active highlights based on current speech node
  const isIntroActive = currentSpeechIdx !== null && speechNodes[currentSpeechIdx]?.id === "intro";
  const isTakeawayActive = currentSpeechIdx !== null && speechNodes[currentSpeechIdx]?.id === "takeaway";
  const isChaptersIntroActive = currentSpeechIdx !== null && speechNodes[currentSpeechIdx]?.id === "chapters-intro";
  const isExcerptsIntroActive = currentSpeechIdx !== null && speechNodes[currentSpeechIdx]?.id === "excerpts-intro";
  const isGuideActive = currentSpeechIdx !== null && speechNodes[currentSpeechIdx]?.id === "guide";

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16 animate-fade-in" id="blog-view">
      
      {/* 🎧 Premium Sequential AI Audio Reader Bar */}
      <div className="sticky top-0 z-40 bg-natural-bg/95 backdrop-blur-md border border-natural-border px-5 py-3 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in transition-all">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl transition-all duration-500 ${isSpeechPlaying ? 'bg-[#6B705C] text-white animate-pulse' : 'bg-natural-warm text-natural-sand'}`}>
            <Volume2 className={`w-5 h-5 ${isSpeechPlaying ? 'scale-110' : ''}`} />
          </div>
          <div className="text-left">
            <h4 className="text-xs font-serif font-bold text-natural-dark flex items-center gap-1.5">
              <span>AI 語音伴讀教練</span>
              {isSpeechLoading && <Loader2 className="w-3 h-3 animate-spin text-[#6B705C]" />}
            </h4>
            <p className="text-[10px] text-natural-sand font-mono mt-0.5">
              {currentSpeechIdx !== null 
                ? `正播放：[ ${speechNodes[currentSpeechIdx]?.label} ] - 進度 ${currentSpeechIdx + 1} / ${speechNodes.length}`
                : "點擊播放啟動全書順序朗讀"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* 語音引擎選擇 */}
          <div className="flex items-center bg-natural-warm/80 p-0.5 rounded-xl border border-natural-border/60 text-[10px] font-sans select-none">
            <button
              onClick={() => handleEngineChange('google')}
              className={`px-2.5 py-1 rounded-lg transition-all font-semibold cursor-pointer ${
                audioEngine === 'google'
                  ? "bg-[#6B705C] text-white shadow-3xs"
                  : "text-natural-sand hover:text-natural-dark"
              }`}
              title="使用 Google Translate 高清語音引擎 (適合所有瀏覽器，推薦 Linux / 行動端)"
            >
              雲端高清
            </button>
            <button
              onClick={() => handleEngineChange('native')}
              className={`px-2.5 py-1 rounded-lg transition-all font-semibold cursor-pointer ${
                audioEngine === 'native'
                  ? "bg-[#6B705C] text-white shadow-3xs"
                  : "text-natural-sand hover:text-natural-dark"
              }`}
              title="使用瀏覽器內建 TTS 引擎"
            >
              系統原生
            </button>
          </div>

          {/* Player Controls */}
          <div className="flex items-center gap-2">
          <button
            onClick={prevSpeech}
            disabled={currentSpeechIdx === null || currentSpeechIdx === 0}
            className="p-2 rounded-xl border border-natural-border bg-natural-bg hover:bg-natural-cream text-natural-sand hover:text-natural-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="上一個段落"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          
          <button
            onClick={togglePlaySpeech}
            disabled={isSpeechLoading}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 font-medium text-xs shadow-2xs transition-all ${
              isSpeechPlaying
                ? "bg-[#6B705C] hover:bg-[#5A5A40] text-white"
                : "bg-natural-dark hover:bg-natural-dark/90 text-white"
            }`}
            title={isSpeechPlaying ? "暫停" : "播放"}
          >
            {isSpeechLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSpeechPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>暫停</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>{currentSpeechIdx !== null ? "繼續" : "開始朗讀"}</span>
              </>
            )}
          </button>

          {currentSpeechIdx !== null && (
            <button
              onClick={stopSpeech}
              className="p-2 rounded-xl border border-natural-border bg-natural-bg hover:bg-red-50 text-red-500 hover:text-red-600 transition-all"
              title="結束朗讀"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          )}

          <button
            onClick={nextSpeech}
            disabled={currentSpeechIdx === null || currentSpeechIdx === speechNodes.length - 1}
            className="p-2 rounded-xl border border-natural-border bg-natural-bg hover:bg-natural-cream text-natural-sand hover:text-natural-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="下一個段落"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
        </div>
      </div>

      {/* Header Splash Area */}
      <div 
        id="blog-header"
        className={`bg-natural-bg rounded-3xl border p-6 md:p-8 shadow-2xs flex flex-col md:flex-row gap-8 items-start relative overflow-hidden transition-all duration-500 ${
          isIntroActive 
            ? "border-[#6B705C] ring-2 ring-[#6B705C]/20 shadow-[0_0_20px_rgba(107,112,92,0.12)] bg-[#6B705C]/[0.01]" 
            : "border-natural-border"
        }`}
      >
        {/* Left vertical border brand line */}
        <div className="absolute top-0 left-0 w-2 h-full bg-[#6B705C]" />
        
        {/* Book Mini Spine Graphic */}
        <div className={`w-full md:w-48 shrink-0 py-8 px-6 bg-gradient-to-br ${getNaturalHeaderBg()} rounded-2xl text-white shadow-xs flex flex-col justify-between h-64 select-none`}>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded">
              {book.category}
            </span>
            <BookOpen className="w-4 h-4 text-white/80" />
          </div>
          <div>
            <h1 className="font-serif font-extrabold text-lg leading-snug line-clamp-3">
              {book.title}
            </h1>
            <p className="text-white/70 text-[10px] mt-1.5 font-mono">DATE: {book.date.replace(/-/g, "/")}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/50 font-medium">Author</p>
            <p className="text-sm font-serif italic">{book.author}</p>
          </div>
        </div>

        {/* Book Intro and Core Quote */}
        <div className="flex-1 space-y-5">
          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-natural-cream text-natural-sage border border-natural-border/40">
              {book.category} • DAILY DISCOVERY
            </span>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-natural-dark tracking-tight">
              {book.title}
            </h2>
          </div>

          <p className="text-natural-dark/90 text-sm md:text-base leading-relaxed">
            {book.description}
          </p>

          <div className="border-l-4 border-natural-sage/40 bg-natural-cream rounded-r-xl pl-4 py-3 pr-3 italic text-natural-dark/80 text-sm relative">
            <Quote className="w-6 h-6 text-[#EBE6DE] absolute -top-3 -left-3 -z-0 opacity-40" />
            <p className="relative z-10 leading-relaxed font-serif">{book.quote}</p>
          </div>
        </div>
      </div>

      {/* Core Takeaway Card - Styled in SAGE GREEN (#6B705C) */}
      <section 
        id="blog-takeaway"
        className={`bg-[#6B705C] rounded-3xl p-6.5 md:p-8 text-white shadow-xs space-y-4 relative overflow-hidden transition-all duration-500 ${
          isTakeawayActive ? "ring-4 ring-[#6B705C]/35 scale-[1.01]" : ""
        }`}
      >
        {/* Abstract vector shape element */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl">
            <Award className="w-6 h-6 text-amber-200" />
          </div>
          <h3 className="text-lg md:text-xl font-serif font-bold tracking-tight">核心精華：全書最關鍵的「一句話」</h3>
        </div>
        <p className="text-[#FDFCF8] text-base md:text-lg leading-relaxed font-serif italic pl-1">
          {book.coreTakeaway}
        </p>
      </section>

      {/* 2 Column Details: Concepts & Chapters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Core Concepts (Left - 7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-[#6B705C] rounded-full" />
            <h4 className="text-lg font-serif font-bold text-natural-dark">核心脈絡瓦解：三大深度觀點</h4>
          </div>

          <div className="space-y-4">
            {book.concepts.map((con, idx) => {
              const isConceptActive = currentSpeechIdx !== null && speechNodes[currentSpeechIdx]?.id === `concept-${idx}`;
              return (
                <div
                  key={idx}
                  id={`concept-card-${idx}`}
                  className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isConceptActive
                      ? "bg-natural-cream border-[#6B705C] ring-2 ring-[#6B705C]/10 shadow-[0_0_15px_rgba(107,112,92,0.15)] scale-[1.01]"
                      : activeConceptIdx === idx
                      ? "bg-natural-cream border-natural-sage shadow-2xs"
                      : "bg-natural-bg border-natural-border hover:border-natural-sand-light"
                  }`}
                  onClick={() => setActiveConceptIdx(idx)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold leading-none transition-colors duration-300 ${
                        isConceptActive || activeConceptIdx === idx ? "bg-[#6B705C] text-white" : "bg-natural-warm text-natural-sand"
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="text-left">
                        <h5 className="font-semibold text-natural-dark text-sm md:text-base">{con.title}</h5>
                        <p className="text-natural-sand text-xs mt-1 leading-normal">{con.description}</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-natural-sand transition-transform ${
                      activeConceptIdx === idx ? "rotate-90 text-[#6B705C]" : ""
                    }`} />
                  </div>

                  {activeConceptIdx === idx && (
                    <div className="mt-4 pt-3.5 border-t border-natural-border text-natural-dark/95 text-xs md:text-sm leading-relaxed whitespace-pre-line font-serif italic animate-fade-in">
                      {con.extendedContent}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Chapter Summary Accordion (Right - 5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-2.5" id="blog-chapters-title">
            <div className={`w-1.5 h-6 rounded-full transition-colors duration-500 ${isChaptersIntroActive ? 'bg-[#6B705C]' : 'bg-natural-sand'}`} />
            <h4 className="text-lg font-serif font-bold text-natural-dark">章節大綱隨讀</h4>
          </div>

          <div className="bg-natural-bg rounded-2xl border border-natural-border p-5 space-y-6 shadow-2xs">
            {book.chapters.map((ch, idx) => {
              const isChapterActive = currentSpeechIdx !== null && speechNodes[currentSpeechIdx]?.id === `chapter-${idx}`;
              return (
                <div 
                  key={idx} 
                  id={`chapter-row-${idx}`}
                  className={`relative pl-6 last:pb-0 pb-6 border-l border-natural-border/80 last:border-0 group text-left transition-all duration-300 ${
                    isChapterActive ? "bg-[#6B705C]/5 rounded-r-xl pr-3 pl-8 scale-[1.02]" : ""
                  }`}
                >
                  {/* timeline node icon */}
                  <span className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white transition-all duration-300 ${
                    isChapterActive ? "bg-[#6B705C] scale-125" : "bg-natural-border group-hover:bg-[#6B705C]"
                  }`} />
                  <h5 className="text-[9px] font-mono font-bold text-natural-sand-light uppercase tracking-widest">CHAPTER {idx + 1}</h5>
                  <h6 className="font-bold text-natural-dark text-sm mt-0.5">{ch.title.split("：")[1] || ch.title}</h6>
                  <p className="text-natural-sand text-xs mt-1.5 leading-relaxed">{ch.summary}</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 7 Key Excerpts - Showcase writing style */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5" id="blog-excerpts-title">
          <div className={`w-1.5 h-6 rounded-full transition-colors duration-500 ${isExcerptsIntroActive ? 'bg-[#6B705C]' : 'bg-rose-400'}`} />
          <h4 className="text-lg font-serif font-bold text-natural-dark">7 大精華節錄：感受這本書的筆觸與溫度</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {book.excerpts?.map((excerpt, idx) => {
            const isExcerptActive = currentSpeechIdx !== null && speechNodes[currentSpeechIdx]?.id === `excerpt-${idx}`;
            return (
              <div 
                key={idx} 
                id={`excerpt-card-${idx}`}
                className={`p-5 rounded-2xl border border-natural-border bg-natural-bg/50 relative overflow-hidden group hover:border-natural-sand transition-all duration-500 ${
                  isExcerptActive 
                    ? "border-[#6B705C] ring-2 ring-[#6B705C]/20 shadow-[0_0_15px_rgba(107,112,92,0.12)] bg-[#6B705C]/5 scale-[1.02]" 
                    : idx === 6 
                    ? "md:col-span-2" 
                    : ""
                }`}
              >
                <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Quote className="w-16 h-16" />
                </div>
                <p className="text-sm text-natural-dark/90 leading-relaxed font-serif italic relative z-10 text-left">
                  「{excerpt}」
                </p>
                <div className="mt-3 flex justify-end">
                  <span className="text-[10px] font-mono text-natural-sand uppercase tracking-tighter">EXCERPT {idx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Target Audience & Guide Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="blog-guide-title">
        
        {/* Readers Group */}
        <div className="bg-natural-bg rounded-3xl p-6.5 border border-natural-border space-y-4 text-left">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-natural-sage" />
            <h4 className="font-serif font-bold text-natural-dark text-base">這本書最適合推薦給：</h4>
          </div>
          <ul className="space-y-2.5">
            {book.targetAudience.map((audience, idx) => (
              <li key={idx} className="flex gap-2 items-start text-xs md:text-sm text-natural-dark/90">
                <Check className="w-4 h-4 text-[#6B705C] shrink-0 mt-0.5" />
                <span>{audience}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Practical Reading Tip */}
        <div className={`bg-natural-cream rounded-3xl p-6.5 border space-y-4 text-left transition-all duration-500 ${
          isGuideActive 
            ? "border-[#6B705C] ring-2 ring-[#6B705C]/20 shadow-[0_0_15px_rgba(107,112,92,0.12)] scale-[1.01]" 
            : "border-natural-border"
        }`}>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-natural-sage" />
            <h4 className="font-serif font-bold text-natural-sage-dark text-base font-medium">如何落實、自主學習指南</h4>
          </div>
          <p className="text-natural-dark/90 text-xs md:text-sm leading-relaxed font-serif italic whitespace-pre-line">
            {book.readingGuide}
          </p>
        </div>

      </div>
    </div>
  );
}
