import React, { useState } from "react";
import { Book } from "../booksData";
import { BookOpen, Award, Users, Compass, Quote, ChevronRight, Check } from "lucide-react";

interface BlogViewProps {
  book: Book;
}

export default function BlogView({ book }: BlogViewProps) {
  const [activeConceptIdx, setActiveConceptIdx] = useState<number | null>(0);

  // Helper theme bg for spine representation matching Natural Tones code-level aesthetics
  const getNaturalHeaderBg = () => {
    if (book.id === "2026-05-21") {
      return "from-[#6B705C] to-[#5A5A40]";
    }
    return "from-[#8B8372] to-[#6A6251]";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16 animate-fade-in" id="blog-view">
      
      {/* Header Splash Area */}
      <div className="bg-white rounded-3xl border border-natural-border p-6 md:p-8 shadow-2xs flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
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
      <section className="bg-[#6B705C] rounded-3xl p-6.5 md:p-8 text-white shadow-xs space-y-4 relative overflow-hidden">
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
            {book.concepts.map((con, idx) => (
              <div
                key={idx}
                id={`concept-card-${idx}`}
                className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                  activeConceptIdx === idx
                    ? "bg-natural-cream border-natural-sage shadow-2xs"
                    : "bg-white border-natural-border hover:border-natural-sand-light"
                }`}
                onClick={() => setActiveConceptIdx(idx)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold leading-none ${
                      activeConceptIdx === idx ? "bg-[#6B705C] text-white" : "bg-natural-warm text-natural-sand"
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
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
            ))}
          </div>
        </div>

        {/* Chapter Summary Accordion (Right - 5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-natural-sand rounded-full" />
            <h4 className="text-lg font-serif font-bold text-natural-dark">章節大綱隨讀</h4>
          </div>

          <div className="bg-white rounded-2xl border border-natural-border p-5 space-y-6 shadow-2xs">
            {book.chapters.map((ch, idx) => (
              <div key={idx} className="relative pl-6 last:pb-0 pb-6 border-l border-natural-border/80 last:border-0 group">
                {/* timeline node icon */}
                <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-natural-border group-hover:bg-[#6B705C] border-2 border-white transition-colors" />
                <h5 className="text-[9px] font-mono font-bold text-natural-sand-light uppercase tracking-widest">CHAPTER {idx + 1}</h5>
                <h6 className="font-bold text-natural-dark text-sm mt-0.5">{ch.title.split("：")[1] || ch.title}</h6>
                <p className="text-natural-sand text-xs mt-1.5 leading-relaxed">{ch.summary}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Target Audience & Guide Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Readers Group */}
        <div className="bg-white rounded-3xl p-6.5 border border-natural-border space-y-4">
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
        <div className="bg-natural-cream rounded-3xl p-6.5 border border-natural-border space-y-4">
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
