const fs = require('fs');
const path = require('path');

// Read the booksData.ts file
const filePath = path.join(__dirname, 'src', 'booksData.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Strip TypeScript interfaces to make it valid JS
// Remove interfaces Chapter, Concept, Book
content = content.replace(/export interface Chapter \{[\s\S]*?\}/g, '');
content = content.replace(/export interface Concept \{[\s\S]*?\}/g, '');
content = content.replace(/export interface Book \{[\s\S]*?\}/g, '');

// Convert export const booksData: Book[] = [ to const booksData = [
content = content.replace(/export const booksData:\s*Book\[\]\s*=\s*\[/, 'const booksData = [');

// Append module.exports
content += '\nmodule.exports = { booksData };';

// Write temp file
const tempFilePath = path.join(__dirname, 'temp_booksData.cjs');
fs.writeFileSync(tempFilePath, content, 'utf8');

// Load booksData
const { booksData } = require('./temp_booksData.cjs');

// Clean up temp file
fs.unlinkSync(tempFilePath);

console.log(`Successfully loaded ${booksData.length} books.`);

// Tag mapping helper
const categoryTags = {
  "宗教文化": ["宗教", "文化", "修行", "歷史"],
  "生活理財": ["理財", "會計", "生活", "觀念"],
  "職場思維": ["職場", "思維", "哲學", "成長"],
  "哲學思辨": ["哲學", "思辨", "思考", "邏輯"],
  "職涯發展": ["職涯", "成長", "工作", "專業"],
  "領導與管理": ["管理", "領導", "溝通", "職場"],
  "溝通與表達": ["溝通", "表達", "說話", "人際"],
  "預言與警示": ["預言", "警示", "未來", "社會"],
  "資訊素養": ["資訊", "素養", "學習", "科技"],
  "投資理財": ["投資", "理財", "股票", "價值"],
  "生活美學": ["美學", "生活", "藝術", "設計"],
  "影音創作": ["影音", "創作", "剪輯", "表達"],
  "生活技能": ["生活", "技能", "學習", "實用"],
  "財務經營": ["財務", "會計", "經營", "商業"],
  "職場經營": ["職場", "經營", "管理", "改善"],
  "心理科學": ["心理", "科學", "認知", "大腦"],
  "世界歷史": ["歷史", "世界", "文明", "大趨勢"],
  "軍事歷史": ["歷史", "軍事", "戰略", "二戰"],
  "文明通史": ["歷史", "文明", "歐洲", "制度"],
  "神話經典": ["神話", "經典", "文化", "想像力"],
  "權謀策略": ["權謀", "策略", "博弈", "心理"],
  "東方命理": ["命理", "五行", "哲學", "平衡"],
  "祕法神祕學": ["神祕學", "魔法", "心靈", "符號"],
  "心理與靈性": ["心理", "靈性", "丹道", "榮格"],
  "人際溝通": ["溝通", "人際", "社交", "心理"],
  "懸疑符號": ["懸疑", "符號", "小說", "歷史"]
};

function generateTags(book) {
  const tags = new Set(categoryTags[book.category] || [book.category]);
  
  // Add some specific tags based on title/description keywords
  if (book.title.includes('榮格') || book.description.includes('榮格')) tags.add('榮格');
  if (book.title.includes('會計') || book.description.includes('會計')) tags.add('會計');
  if (book.title.includes('魔法') || book.description.includes('魔法')) tags.add('魔法');
  if (book.title.includes('鬼谷子')) tags.add('鬼谷子');
  if (book.title.includes('山海經')) tags.add('山海經');
  if (book.title.includes('二戰') || book.title.includes('世界大戰')) tags.add('二戰');
  if (book.title.includes('道教') || book.description.includes('道教')) tags.add('道教');
  if (book.title.includes('滴天髓') || book.title.includes('八字')) tags.add('八字');
  if (book.title.includes('達文西')) tags.add('達文西');
  
  return Array.from(tags);
}

// Map books with tags
const taggedBooks = booksData.map(book => ({
  ...book,
  tags: generateTags(book)
}));

// Filter into May and June
const books05 = taggedBooks.filter(book => book.date.startsWith('2026-05'));
const books06 = taggedBooks.filter(book => book.date.startsWith('2026-06'));

console.log(`May 2026 books count: ${books05.length}`);
console.log(`June 2026 books count: ${books06.length}`);

// Ensure directory exists
const targetDir = path.join(__dirname, 'src', 'data', 'books');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Function to format array of books to beautiful TypeScript code
function serializeBooks(books, exportName) {
  const jsonStr = JSON.stringify(books, null, 2);
  return `import { Book } from '../../booksData';\n\nexport const ${exportName}: Book[] = ${jsonStr};\n`;
}

fs.writeFileSync(path.join(targetDir, '2026-05.ts'), serializeBooks(books05, 'books202605'), 'utf8');
fs.writeFileSync(path.join(targetDir, '2026-06.ts'), serializeBooks(books06, 'books202606'), 'utf8');

console.log('Successfully wrote 2026-05.ts and 2026-06.ts!');
