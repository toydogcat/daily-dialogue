import React from "react";
import { Book } from "../booksData";
import { BookOpen, Calendar, ArrowRight, Award } from "lucide-react";

interface BookCardProps {
  key?: string;
  book: {
    id: string;
    date: string;
    title: string;
    author: string;
    category: string;
    coverGradient: string;
    description: string;
    coreTakeaway: string;
  };
  onSelect: (id: string, initialMode?: "chat" | "blog") => void;
}

export default function BookCard({ book, onSelect }: BookCardProps) {
  // Format the date to show nicely
  const formattedDate = book.date.replace(/-/g, "/");

  // Choose a custom subtle overlay color for the card's inner book skin based on the daily theme
  const getNaturalHeaderBg = () => {
    if (book.id === "2026-05-21") {
      return "bg-gradient-to-br from-[#6B705C] to-[#5A5A40]";
    }
    return "bg-gradient-to-br from-[#8B8372] to-[#6A6251]";
  };

  return (
    <div
      id={`book-card-${book.id}`}
      className="group bg-natural-bg rounded-2xl border border-natural-border hover:border-natural-sand-light shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col h-full"
    >
      {/* Visual Cover Header */}
      <div className={`relative px-6 py-8 ${getNaturalHeaderBg()} text-white flex flex-col justify-between h-48 overflow-hidden`}>
        {/* Floating background shape for extra polish */}
        <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
        
        {/* Header Tag info */}
        <div className="flex justify-between items-center z-10">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-white/25 backdrop-blur-xs text-white">
            <Calendar className="w-3.5 h-3.5" />
            {formattedDate}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-xs text-white">
            {book.category}
          </span>
        </div>

        {/* Book Spine Simulation */}
        <div className="z-10 mt-4">
          <p className="text-white/70 text-[10px] font-mono font-bold tracking-widest uppercase">DAILY DIALOGUE</p>
          <h3 className="font-serif text-xl font-bold tracking-normal mt-1 line-clamp-2 select-none">
            {book.title}
          </h3>
          <p className="text-white/85 text-xs mt-1 font-serif italic">{book.author}</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 flex-1 flex flex-col justify-between bg-natural-bg">
        <div className="space-y-4">
          <p className="text-natural-dark/90 text-sm leading-relaxed line-clamp-3">
            {book.description}
          </p>

          <div className="bg-natural-cream rounded-xl p-3.5 border border-natural-border/60">
            <div className="flex gap-2 items-start">
              <Award className="w-4 h-4 text-natural-sage shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-mono font-bold text-natural-sand uppercase tracking-wider">核心精華</p>
                <p className="text-xs text-natural-dark font-serif leading-normal line-clamp-2 italic font-medium">
                  {book.coreTakeaway}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button Section split into Chat or Blog */}
        <div className="mt-6 pt-4 border-t border-natural-border/75 grid grid-cols-2 gap-2.5">
          <button
            id={`btn-blog-${book.id}`}
            onClick={() => onSelect(book.id, "blog")}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-natural-dark hover:text-natural-sage-dark bg-natural-warm hover:bg-natural-border/65 border border-natural-border transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            閱讀精華
          </button>
          
          <button
            id={`btn-chat-${book.id}`}
            onClick={() => onSelect(book.id, "chat")}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-natural-sage hover:bg-natural-sage-dark shadow-xs transition-colors cursor-pointer"
          >
            進入對話
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
