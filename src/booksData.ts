import { booksMetadata } from './data/booksMetadata';

export interface Chapter {
  title: string;
  summary: string;
}

export interface Concept {
  title: string;
  description: string;
  extendedContent: string;
}

export interface BookMetadata {
  id: string;
  date: string; // YYYY-MM-DD format
  title: string;
  author: string;
  category: string;
  coverGradient: string; // CSS gradient description for display
  description: string;
  coreTakeaway: string;
  tags: string[];
  targetAudience: string[];
}

export interface Book extends BookMetadata {
  chapters: Chapter[];
  concepts: Concept[];
  readingGuide: string;
  quote: string;
  excerpts: string[]; // 7 key excerpts to show style
}

// booksData is now a lightweight array containing only book metadata
export const booksData: BookMetadata[] = booksMetadata;

// Helper function to dynamically load the full book detail
export async function loadBookDetail(id: string): Promise<Book> {
  const parts = id.split('-');
  const year = parts[0];
  const month = parts[1];
  const day = parseInt(parts[2], 10);
  
  let week = 'week4';
  if (day >= 1 && day <= 7) week = 'week1';
  else if (day >= 8 && day <= 14) week = 'week2';
  else if (day >= 15 && day <= 21) week = 'week3';

  // Dynamic import with template literal lets Vite code-split these files
  const module = await import(`./data/books/${year}-${month}-${week}.ts`);
  
  // Format standard week export name (e.g. books202601Week1)
  const capitalizedWeek = week.charAt(0).toUpperCase() + week.slice(1);
  const arrayName = `books${year}${month}${capitalizedWeek}`;
  
  const booksList = module[arrayName] as Book[];
  if (!booksList) {
    throw new Error(`Failed to locate array ${arrayName} in chunk ${year}-${month}-${week}`);
  }

  const foundBook = booksList.find(b => b.id === id);
  if (!foundBook) {
    throw new Error(`Book with id ${id} not found in dynamic chunk ${year}-${month}-${week}`);
  }

  return foundBook;
}
