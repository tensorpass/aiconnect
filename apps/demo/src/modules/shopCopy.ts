// The bookshop's own words in each language of the playground: its page, and what it gives the
// modules (the instructions for the visitor's AI, the guards it tunes, the suggested questions, the
// tool's plain name).

import type { GuardPolicy } from '@tensorpass/aiconnect';
import type { Locale } from '@tensorpass/aiconnect-react';
import { SEARCH_BOOKS } from '../bookCatalog.ts';

export interface ShopCopy {
  shopName: string;
  heading: string;
  lede: string;
  shelf: string;
  pages: (count: number) => string;
  intro: string;
  suggestions: string[];
  toolLabels: Record<string, string>;
  // The shop's line under the question box, crediting the AI features to TensorPass.
  credit: string;
}

export const SYSTEM = [
  'You recommend books from this site\'s catalog. Always search the catalog before recommending.',
  'Moods in the catalog are English words. Name each book exactly as the catalog does.',
  'Answer in the visitor\'s language, in two or three short sentences.',
].join(' ');

// The shop's guards: its tool's name stays out of the answers, and the chat sticks to books.
export const GUARDS: GuardPolicy = {
  scope: 'the books of this shop and what to read',
  denyPatterns: [SEARCH_BOOKS],
};

export const SHOP_COPY: Record<Locale, ShopCopy> = {
  en: {
    shopName: 'Bookshop',
    heading: 'Books for every mood',
    lede: 'Tell the shop how you feel tonight, and your own AI finds the book in our catalog.',
    shelf: 'On the shelf',
    pages: (count) => `${count} pages`,
    intro: 'What do you feel like reading?',
    suggestions: ['A calm book for tonight', 'Something funny and hopeful', 'An adventure under 320 pages'],
    toolLabels: { [SEARCH_BOOKS]: 'Searching the catalog' },
    credit: 'AI features powered by TensorPass',
  },
  fr: {
    shopName: 'Librairie',
    heading: 'Des livres pour chaque humeur',
    lede: 'Dites à la librairie ce qui vous tente ce soir, et votre propre IA trouve le livre dans notre catalogue.',
    shelf: 'En rayon',
    pages: (count) => `${count} pages`,
    intro: 'Qu\'avez-vous envie de lire ?',
    suggestions: ['Un livre calme pour ce soir', 'Quelque chose de drôle et plein d\'espoir',
      'Une aventure de moins de 320 pages'],
    toolLabels: { [SEARCH_BOOKS]: 'Recherche dans le catalogue' },
    credit: 'Fonctions IA fournies par TensorPass',
  },
  he: {
    shopName: 'חנות ספרים',
    heading: 'ספרים לכל מצב רוח',
    lede: 'ספרו לחנות מה מתחשק לכם הערב, והבינה המלאכותית שלכם תמצא את הספר בקטלוג שלנו.',
    shelf: 'על המדף',
    pages: (count) => `${count} עמודים`,
    intro: 'מה בא לכם לקרוא?',
    suggestions: ['ספר רגוע להערב', 'משהו מצחיק ומלא תקווה', 'הרפתקה של פחות מ 320 עמודים'],
    toolLabels: { [SEARCH_BOOKS]: 'מחפשים בקטלוג' },
    credit: 'תכונות AI מופעלות על ידי TensorPass',
  },
  ar: {
    shopName: 'مكتبة',
    heading: 'كتب لكل مزاج',
    lede: 'أخبر المكتبة بما تشعر به الليلة، وسيجد الذكاء الاصطناعي الخاص بك الكتاب في فهرسنا.',
    shelf: 'على الرف',
    pages: (count) => `${count} صفحة`,
    intro: 'ماذا تحب أن تقرأ؟',
    suggestions: ['كتاب هادئ لهذه الليلة', 'شيء مضحك ومليء بالأمل', 'مغامرة في أقل من 320 صفحة'],
    toolLabels: { [SEARCH_BOOKS]: 'جارٍ البحث في الفهرس' },
    credit: 'ميزات الذكاء الاصطناعي من TensorPass',
  },
  zh: {
    shopName: '书店',
    heading: '适合每种心情的书',
    lede: '告诉书店你今晚的心情，你自己的 AI 会在我们的书目中找到那本书。',
    shelf: '在架图书',
    pages: (count) => `${count} 页`,
    intro: '你想读点什么？',
    suggestions: ['今晚读一本安静的书', '有趣又充满希望的书', '320 页以内的冒险故事'],
    toolLabels: { [SEARCH_BOOKS]: '正在搜索书目' },
    credit: 'AI 功能由 TensorPass 提供',
  },
};
