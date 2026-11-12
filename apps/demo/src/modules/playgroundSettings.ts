// What the modules playground shows, kept in the page's address so a link opens the same view:
// `?module=` picks the form, `lang=` the language and `theme=` light or dark.

import type { Locale } from '@tensorpass/aiconnect-react';

export const FORMS = [
  { id: 'panel', label: 'Side panel' },
  { id: 'popup', label: 'Popup' },
  { id: 'inline', label: 'Inline' },
  { id: 'page', label: 'Full page' },
  { id: 'search', label: 'Search bar' },
] as const;

export const LANGUAGES: { id: Locale; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'Français' },
  { id: 'he', label: 'עברית' },
  { id: 'ar', label: 'العربية' },
  { id: 'zh', label: '中文' },
];

export const THEMES = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
] as const;

export type Form = (typeof FORMS)[number]['id'];
export type Theme = (typeof THEMES)[number]['id'];

export interface PlaygroundSettings {
  form: Form;
  lang: Locale;
  theme: Theme;
}

function pick<T extends string>(value: string | null, choices: readonly { id: T }[]): T {
  return choices.find((choice) => choice.id === value)?.id ?? choices[0].id;
}

export function isPlayground(search: string): boolean {
  return new URLSearchParams(search).has('module');
}

export function readSettings(search: string): PlaygroundSettings {
  const params = new URLSearchParams(search);
  return {
    form: pick(params.get('module'), FORMS),
    lang: pick(params.get('lang'), LANGUAGES),
    theme: pick(params.get('theme'), THEMES),
  };
}

export function settingsSearch({ form, lang, theme }: PlaygroundSettings): string {
  return `?${new URLSearchParams({ module: form, lang, theme })}`;
}
