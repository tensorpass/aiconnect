// The bookshop's own book card, on its shelf and under an answer. Under an answer, the cards are the
// books the catalog search returned that the answer names, in the order the answer names them: the
// modules' `renderToolResults` draws them.

import type { ReactNode } from 'react';
import type { ChatTurn } from '@tensorpass/aiconnect-react';
import { SEARCH_BOOKS } from '../bookCatalog.ts';
import type { Book } from '../bookCatalog.ts';

function foundBooks(turn: ChatTurn): Book[] {
  const found = new Map<string, Book>();
  for (const { call, result } of turn.tools) {
    if (call.name !== SEARCH_BOOKS || !result || result.startsWith('Tool error:')) {
      continue;
    }
    for (const book of JSON.parse(result) as Book[]) {
      found.set(book.title, book);
    }
  }
  return [...found.values()];
}

function namedBooks(turn: ChatTurn): Book[] {
  const answer = turn.answer.toLowerCase();
  return foundBooks(turn)
    .map((book) => ({ book, position: answer.indexOf(book.title.toLowerCase()) }))
    .filter(({ position }) => position >= 0)
    .sort((a, b) => a.position - b.position)
    .map(({ book }) => book);
}

export function BookCard({ book, pages }: { book: Book; pages: string }) {
  return (
    <article className="book">
      <span className="book-cover" style={{ background: book.cover }} aria-hidden="true">{book.title}</span>
      <span className="book-text">
        <b>{book.title}</b>
        <span>{book.author}</span>
        <span className="book-pages">{pages}</span>
      </span>
    </article>
  );
}

export function bookResults(pages: (count: number) => string) {
  return (turn: ChatTurn): ReactNode => {
    const books = namedBooks(turn);
    if (books.length === 0) {
      return null;
    }
    return (
      <ul className="book-results">
        {books.map((book) => <li key={book.title}><BookCard book={book} pages={pages(book.pages)} /></li>)}
      </ul>
    );
  };
}
