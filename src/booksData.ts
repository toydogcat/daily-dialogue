import { books202604 } from './data/books/2026-04';
import { books202605 } from './data/books/2026-05';
import { books202606 } from './data/books/2026-06';

export interface Chapter {
  title: string;
  summary: string;
}

export interface Concept {
  title: string;
  description: string;
  extendedContent: string;
}

export interface Book {
  id: string;
  date: string; // YYYY-MM-DD format
  title: string;
  author: string;
  category: string;
  coverGradient: string; // CSS gradient description for display
  description: string;
  coreTakeaway: string;
  chapters: Chapter[];
  concepts: Concept[];
  targetAudience: string[];
  readingGuide: string;
  quote: string;
  tags: string[];
}

export const booksData: Book[] = [
  ...books202604,
  ...books202605,
  ...books202606
];
