import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const booksDir = path.resolve(__dirname, '../src/data/books');

// Helper to determine the week name based on the day
function getWeekName(day: number): string {
  if (day >= 1 && day <= 7) return 'week1';
  if (day >= 8 && day <= 14) return 'week2';
  if (day >= 15 && day <= 21) return 'week3';
  return 'week4';
}

async function runAudit() {
  console.log('=== STARTING ALL BOOKS AUDIT ===');
  
  const files = fs.readdirSync(booksDir)
    .filter(file => file.endsWith('.ts') && !file.endsWith('Metadata.ts'));
    
  let totalBooks = 0;
  let totalErrors = 0;
  const seenIds = new Set<string>();
  const seenDates = new Set<string>();

  for (const file of files) {
    const filePath = path.join(booksDir, file);
    const fileName = path.basename(file);
    
    // Parse month and week from filename (e.g. 2026-01-week1.ts)
    const fileMatch = fileName.match(/^(\d{4})-(\d{2})-(week\d)\.ts$/);
    if (!fileMatch) {
      console.warn(`⚠️ Warning: Filename ${fileName} does not match standard pattern YYYY-MM-weekX.ts`);
      continue;
    }
    const [_, fileYear, fileMonth, fileWeek] = fileMatch;

    try {
      const module = await import(filePath);
      const exportKey = Object.keys(module).find(key => key.startsWith('books'));
      if (!exportKey) {
        console.error(`❌ Error in ${fileName}: No exported array starting with 'books' found.`);
        totalErrors++;
        continue;
      }
      
      // Check that exportKey matches standard booksYYYYMMWeekX pattern
      const expectedExportKey = `books${fileYear}${fileMonth}${fileWeek.charAt(0).toUpperCase() + fileWeek.slice(1)}`;
      if (exportKey !== expectedExportKey) {
        console.error(`❌ Error in ${fileName}: Exported array key is '${exportKey}', but expected '${expectedExportKey}'`);
        totalErrors++;
      }

      const books = module[exportKey];
      if (!Array.isArray(books)) {
        console.error(`❌ Error in ${fileName}: Exported member '${exportKey}' is not an array.`);
        totalErrors++;
        continue;
      }

      for (let i = 0; i < books.length; i++) {
        const book = books[i];
        totalBooks++;
        const bookIdentifier = book.title || `Book at index ${i}`;
        const prefix = `[${fileName} - ${bookIdentifier}]`;

        // 1. Verify required fields
        const requiredFields = [
          'id', 'date', 'title', 'author', 'category', 'coverGradient',
          'description', 'coreTakeaway', 'quote', 'chapters', 'concepts',
          'targetAudience', 'readingGuide', 'tags', 'excerpts'
        ];

        for (const field of requiredFields) {
          if (book[field] === undefined || book[field] === null || book[field] === '') {
            console.error(`❌ ${prefix}: Missing required field '${field}'`);
            totalErrors++;
          }
        }

        // 2. Validate format of ID and Date
        if (book.id) {
          if (seenIds.has(book.id)) {
            console.error(`❌ ${prefix}: Duplicate ID found: ${book.id}`);
            totalErrors++;
          }
          seenIds.add(book.id);
        }

        if (book.date) {
          if (seenDates.has(book.date)) {
            console.error(`❌ ${prefix}: Duplicate Date found: ${book.date}`);
            totalErrors++;
          }
          seenDates.add(book.date);

          // Verify date format YYYY-MM-DD
          const dateParts = book.date.split('-');
          if (dateParts.length !== 3 || dateParts[0].length !== 4 || dateParts[1].length !== 2 || dateParts[2].length !== 2) {
            console.error(`❌ ${prefix}: Date format must be YYYY-MM-DD, got '${book.date}'`);
            totalErrors++;
          } else {
            // Verify date matches file location (Year and Month)
            const [by, bm, bd] = dateParts;
            if (by !== fileYear || bm !== fileMonth) {
              console.error(`❌ ${prefix}: Book date '${book.date}' does not match file month '${fileYear}-${fileMonth}'`);
              totalErrors++;
            }
            
            // Verify date matches standard week rules
            const dayNum = parseInt(bd, 10);
            const expectedWeek = getWeekName(dayNum);
            if (expectedWeek !== fileWeek) {
              console.error(`❌ ${prefix}: Book date '${book.date}' (day ${dayNum}) should belong to '${expectedWeek}' but is placed in '${fileWeek}'`);
              totalErrors++;
            }
            
            // Verify id matches date
            if (book.id !== book.date) {
              console.error(`❌ ${prefix}: Book ID '${book.id}' does not match Date '${book.date}'`);
              totalErrors++;
            }
          }
        }

        // 3. Validate nested arrays structure
        if (Array.isArray(book.chapters)) {
          book.chapters.forEach((chapter: any, cIdx: number) => {
            if (typeof chapter.title !== 'string' || !chapter.title) {
              console.error(`❌ ${prefix}: Chapter ${cIdx + 1} is missing a valid title.`);
              totalErrors++;
            }
            if (typeof chapter.summary !== 'string' || !chapter.summary) {
              console.error(`❌ ${prefix}: Chapter ${cIdx + 1} is missing a valid summary.`);
              totalErrors++;
            }
          });
        }

        if (Array.isArray(book.concepts)) {
          book.concepts.forEach((concept: any, cIdx: number) => {
            if (typeof concept.title !== 'string' || !concept.title) {
              console.error(`❌ ${prefix}: Concept ${cIdx + 1} is missing a valid title.`);
              totalErrors++;
            }
            if (typeof concept.description !== 'string' || !concept.description) {
              console.error(`❌ ${prefix}: Concept ${cIdx + 1} is missing a valid description.`);
              totalErrors++;
            }
            if (typeof concept.extendedContent !== 'string' || !concept.extendedContent) {
              console.error(`❌ ${prefix}: Concept ${cIdx + 1} is missing valid extendedContent.`);
              totalErrors++;
            }
          });
        }

        if (Array.isArray(book.tags)) {
          book.tags.forEach((tag: any, tIdx: number) => {
            if (typeof tag !== 'string' || !tag) {
              console.error(`❌ ${prefix}: Tag at index ${tIdx} is not a valid string.`);
              totalErrors++;
            }
          });
        }

        if (Array.isArray(book.targetAudience)) {
          book.targetAudience.forEach((audience: any, aIdx: number) => {
            if (typeof audience !== 'string' || !audience) {
              console.error(`❌ ${prefix}: Target audience at index ${aIdx} is not a valid string.`);
              totalErrors++;
            }
          });
        }

        if (Array.isArray(book.excerpts)) {
          if (book.excerpts.length !== 7) {
            console.warn(`⚠️ ${prefix}: Has ${book.excerpts.length} excerpts instead of exactly 7.`);
          }
          book.excerpts.forEach((excerpt: any, eIdx: number) => {
            if (typeof excerpt !== 'string' || !excerpt) {
              console.error(`❌ ${prefix}: Excerpt at index ${eIdx} is not a valid string.`);
              totalErrors++;
            }
          });
        }
      }

    } catch (err) {
      console.error(`❌ Error importing ${fileName}:`, err);
      totalErrors++;
    }
  }

  console.log('\n=== AUDIT SUMMARY ===');
  console.log(`Total weekly files inspected: ${files.length}`);
  console.log(`Total books audited: ${totalBooks}`);
  console.log(`Total errors found: ${totalErrors}`);
  
  if (totalErrors === 0) {
    console.log('🟢 PASS: All book files conform perfectly to standard weekly schedules and the Book schema! No errors found.');
  } else {
    console.log('🔴 FAIL: Errors were detected. Please review the details above.');
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Audit run crashed:', err);
  process.exit(1);
});
