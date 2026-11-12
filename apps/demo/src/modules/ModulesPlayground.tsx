// The modules playground: the bookshop's page with one interface module placed where a site would
// put it, under the playground's own bar that switches the form, the language and the theme. Every
// form answers with the shop's catalog tools served from memory, under the shop's guards, and draws
// the books an answer names as the shop's own cards.

import { useEffect, useMemo, useState } from 'react';
import type { AiConnect } from '@tensorpass/aiconnect';
import {
  AiChatInline, AiChatPage, AiChatPanel, AiChatPopup, AiConnectProvider, AiSearch, builtInModuleMessages,
} from '@tensorpass/aiconnect-react';
import '@fontsource/noto-sans-arabic/400.css';
import '@fontsource/noto-sans-arabic/700.css';
import '@fontsource/noto-sans-arabic/800.css';
import '@fontsource/noto-sans-hebrew/400.css';
import '@fontsource/noto-sans-hebrew/700.css';
import '@fontsource/noto-sans-hebrew/800.css';
import '@fontsource/reddit-mono/600.css';
import '@fontsource/reddit-sans/400.css';
import '@fontsource/reddit-sans/500.css';
import '@fontsource/reddit-sans/600.css';
import '@fontsource/reddit-sans/700.css';
import '@fontsource/reddit-sans/800.css';
import { BOOKS } from '../bookCatalog.ts';
import { demoTools } from '../demoTools.ts';
import { BookCard, bookResults } from './BookCards.tsx';
import { PlaygroundBar } from './PlaygroundBar.tsx';
import { readSettings, settingsSearch } from './playgroundSettings.ts';
import type { PlaygroundSettings } from './playgroundSettings.ts';
import { GUARDS, SHOP_COPY, SYSTEM } from './shopCopy.ts';
import type { ShopCopy } from './shopCopy.ts';
import './playground.css';

function usePageLanguage({ lang, theme }: PlaygroundSettings) {
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = builtInModuleMessages[lang].dir;
    root.dataset.aicTheme = theme;
  }, [lang, theme]);
}

function Shelf({ copy }: { copy: ShopCopy }) {
  return (
    <section className="shelf" aria-labelledby="shelf-title">
      <h2 id="shelf-title">{copy.shelf}</h2>
      <ul>
        {BOOKS.map((book) => <li key={book.title}><BookCard book={book} pages={copy.pages(book.pages)} /></li>)}
      </ul>
    </section>
  );
}

function ShopPage({ form, copy }: { form: PlaygroundSettings['form']; copy: ShopCopy }) {
  const renderToolResults = useMemo(() => bookResults(copy.pages), [copy]);
  const module = {
    system: SYSTEM, tools: demoTools, guards: GUARDS, intro: copy.intro, suggestions: copy.suggestions,
    toolLabels: copy.toolLabels, renderToolResults,
  };
  return (
    <>
      <header className="shop-head">
        <span className="shop-name">{copy.shopName}</span>
        {form === 'panel' ? <AiChatPanel {...module} /> : null}
        {form === 'page' ? <AiChatPage {...module} /> : null}
      </header>
      <main className="shop-main" data-form={form}>
        <section className="shop-hero">
          <h1>{copy.heading}</h1>
          <p>{copy.lede}</p>
          {form === 'search' ? <AiSearch {...module} /> : null}
        </section>
        {form === 'inline' ? <AiChatInline {...module} /> : null}
        <Shelf copy={copy} />
      </main>
      {form === 'popup' ? <AiChatPopup {...module} /> : null}
    </>
  );
}

export function ModulesPlayground({ client }: { client: AiConnect }) {
  const [settings, setSettings] = useState(() => readSettings(window.location.search));
  usePageLanguage(settings);
  const change = (next: Partial<PlaygroundSettings>) => {
    const merged = { ...settings, ...next };
    setSettings(merged);
    window.history.replaceState(null, '', settingsSearch(merged));
  };
  return (
    <div className="shop">
      <AiConnectProvider client={client} locale={settings.lang}>
        <PlaygroundBar settings={settings} onChange={change} />
        <ShopPage key={settings.form} form={settings.form} copy={SHOP_COPY[settings.lang]} />
      </AiConnectProvider>
    </div>
  );
}
