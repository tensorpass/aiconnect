// The language the visitor dictates in: the module's language, with the region of the first of the
// visitor's browser languages that shares it, such as `he-IL` or `ar-MA`, so the recognition hears the
// visitor's accent. Without one, the language's most spoken region.

import type { Locale } from '../../../pickerMessages.ts';

const DEFAULT_REGIONS: Record<Locale, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  he: 'he-IL',
  ar: 'ar-EG',
  zh: 'zh-CN',
};

export function dictationLanguage(locale: Locale, browserLanguages: readonly string[]): string {
  const match = browserLanguages.find((tag) => tag.toLowerCase().split('-')[0] === locale && tag.includes('-'));
  return match ?? DEFAULT_REGIONS[locale];
}
