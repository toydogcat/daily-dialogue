import { books202604Week1 } from './data/books/2026-04-week1';
import { books202604Week2 } from './data/books/2026-04-week2';
import { books202604Week3 } from './data/books/2026-04-week3';
import { books202604Week4 } from './data/books/2026-04-week4';
import { books202605Week1 } from './data/books/2026-05-week1';
import { books202605Week2 } from './data/books/2026-05-week2';
import { books202605Week3 } from './data/books/2026-05-week3';
import { books202605Week4 } from './data/books/2026-05-week4';
import { books202606Week1 } from './data/books/2026-06-week1';
import { books202606Week2 } from './data/books/2026-06-week2';
import { books202606Week3 } from './data/books/2026-06-week3';
import { books202606Week4 } from './data/books/2026-06-week4';

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
  excerpts: string[]; // 7 key excerpts to show style
  tags: string[];
}

export const booksData: Book[] = [
  ...books202604Week1,
  ...books202604Week2,
  ...books202604Week3,
  ...books202604Week4,
  ...books202605Week1,
  ...books202605Week2,
  ...books202605Week3,
  ...books202605Week4,
  ...books202606Week1,
  ...books202606Week2,
  ...books202606Week3,
  ...books202606Week4
];
