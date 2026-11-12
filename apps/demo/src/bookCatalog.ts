// The bookshop's tiny catalog and its one search tool, shared by the tools the page serves from
// memory and by the MCP server the demo's dev server runs for the Web Components page.

import type { ToolDefinition } from '@tensorpass/aiconnect';

export interface Book {
  title: string;
  author: string;
  mood: string[];
  pages: number;
  // The colour of the book's cover on the shop's cards.
  cover: string;
}

export const BOOKS: Book[] = [
  { title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', mood: ['thoughtful', 'cold'], pages: 304,
    cover: '#2f4b6e' },
  { title: 'Piranesi', author: 'Susanna Clarke', mood: ['dreamy', 'calm', 'mysterious'], pages: 272, cover: '#3d6b73' },
  { title: 'The Hobbit', author: 'J. R. R. Tolkien', mood: ['cosy', 'adventurous'], pages: 310, cover: '#6b4f2a' },
  { title: 'Project Hail Mary', author: 'Andy Weir', mood: ['funny', 'adventurous', 'hopeful'], pages: 496,
    cover: '#b5562d' },
  { title: 'Gilead', author: 'Marilynne Robinson', mood: ['calm', 'thoughtful', 'hopeful'], pages: 247,
    cover: '#7a6a3f' },
];

export const SEARCH_BOOKS = 'search_books';

export const BOOK_TOOLS: ToolDefinition[] = [
  {
    name: SEARCH_BOOKS,
    description: 'Find books in the catalog by mood and maximum length.',
    inputSchema: {
      type: 'object',
      properties: {
        mood: { type: 'string', description: 'One mood word, such as calm, funny or adventurous' },
        maxPages: { type: 'number' },
      },
    },
  },
];

export function searchBooks(args: Record<string, unknown>): Book[] {
  const mood = typeof args.mood === 'string' ? args.mood.toLowerCase() : null;
  const maxPages = typeof args.maxPages === 'number' ? args.maxPages : Infinity;
  return BOOKS.filter((book) => (!mood || book.mood.includes(mood)) && book.pages <= maxPages);
}
