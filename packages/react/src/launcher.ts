// What the buttons that open a chat over the page show: their label in each language, the reading
// direction, and the wallet's wave mark. The modules draw these buttons with React, and the Web
// Components' loader draws the same ones before the chat's script arrives, so a page shows one button
// before and after. The module holds no React, which keeps the loader small.

export type LauncherLocale = 'en' | 'fr' | 'he' | 'ar' | 'zh';

export interface LauncherMessages {
  dir: 'ltr' | 'rtl';
  // The chat's heading, which also labels a side panel's button.
  title: string;
  // The full page's heading, which also labels its button.
  pageTitle: string;
  // The floating button's label while the popup is closed, then while it is open.
  openChat: string;
  closeChat: string;
}

export const builtInLauncherMessages: Record<LauncherLocale, LauncherMessages> = {
  en: {
    dir: 'ltr',
    title: 'Ask AI',
    pageTitle: 'AI mode',
    openChat: 'Open the chat',
    closeChat: 'Close the chat',
  },
  fr: {
    dir: 'ltr',
    title: 'Demandez à l\'IA',
    pageTitle: 'Mode IA',
    openChat: 'Ouvrir la conversation',
    closeChat: 'Fermer la conversation',
  },
  he: {
    dir: 'rtl',
    title: 'שאלו את הבינה המלאכותית',
    pageTitle: 'מצב AI',
    openChat: 'פתיחת השיחה',
    closeChat: 'סגירת השיחה',
  },
  ar: {
    dir: 'rtl',
    title: 'اسأل الذكاء الاصطناعي',
    pageTitle: 'وضع الذكاء الاصطناعي',
    openChat: 'فتح المحادثة',
    closeChat: 'إغلاق المحادثة',
  },
  zh: {
    dir: 'ltr',
    title: '问问 AI',
    pageTitle: 'AI 模式',
    openChat: '打开聊天',
    closeChat: '关闭聊天',
  },
};

// The wallet's wave mark: three arcs on a 24 grid, each its own path so a live answer can light them
// one after the other.
export const WAVE_ARCS = ['M6 8.5a5 5 0 0 1 0 7', 'M10.5 5.5a9.5 9.5 0 0 1 0 13', 'M15 2.5a14 14 0 0 1 0 19'];
export const WAVE_STROKE_WIDTH = 2.4;
