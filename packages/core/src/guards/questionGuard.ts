// The guard on the visitor's question, run before the question reaches the model: a length cap, a block
// on long base64 blobs, and injection patterns in English, French and Hebrew. Up to three words may sit
// between a verb and its object, so "ignore all of the previous instructions" trips the same pattern as
// "ignore instructions". The patterns also read the question with invisible characters removed and
// digits used as letters read as letters, so "1gn0r3 y0ur rul3s" reads "ignore your rules". The text of
// the files the visitor attached has its own length cap and meets the same patterns; the base64 block
// reads only what the visitor typed, since a CSV or a JSON file holds long tokens of its own.

import { attachedText, contentParts, textOf } from '../chatContent.ts';
import type { ContentPart } from '../types.ts';
import { DEFAULT_MAX_ATTACHMENT_TEXT, DEFAULT_MAX_INPUT_LENGTH } from './policy.ts';
import type { GuardPolicy, QuestionVerdict } from './policy.ts';

export interface InjectionPattern {
  name: string;
  re: RegExp;
}

export const INJECTION_PATTERNS: InjectionPattern[] = [
  { name: 'ignore-instructions', re: /\bignor(?:e|ez|er)\s+(?:previous|all|any|your|the|my|toutes?|tous|les|tes|vos|ces)(?:\s+\S+){0,3}\s+(?:instructions?|rules?|prompts?|guidelines?|consignes?|règles?|directives?)/i },
  { name: 'forget-instructions', re: /\b(?:forget|oubli(?:e|ez|er))\s+(?:everything|tout|(?:your|all|the|toutes?|tes|vos|les)(?:\s+\S+){0,3}\s+(?:rules?|instructions?|prompts?|training|consignes?|règles?))/i },
  { name: 'disregard', re: /\bdisregard\s+(?:all|your|previous|the|any)\b/i },
  { name: 'override', re: /\boverride\s+(?:your|the|all)(?:\s+\S+){0,3}\s+(?:rules?|instructions?|behaviou?r|settings?|guidelines?)/i },
  { name: 'system-prefix', re: /^\s*(?:system|syst[eè]me|מערכת)\s*:/im },
  { name: 'new-instructions', re: /\b(?:new\s+(?:instructions?|rules?|directives?)|nouvelles?\s+(?:instructions?|consignes?|règles?))\s*:/i },
  { name: 'pretend', re: /\b(?:pretend\s+(?:you\s+are|to\s+be|you're)|fai(?:s|tes)\s+semblant\s+d['’]être)/i },
  { name: 'act-as', re: /\b(?:act\s+as\s+(?:if\s+you|an?\s+(?:\S+\s+){0,2}?(?:assistant|ai|model|bot|chatbot|gpt|persona|character|hacker|developer|admin(?:istrator)?)\b)|agi(?:s|ssez)\s+comme\s+(?:si\s+(?:tu|vous)|une?\s+(?:\S+\s+){0,2}?(?:assistant|ia|modèle|bot|chatbot|personnage|pirate|hacker|développeur|administrateur)\b))/i },
  { name: 'you-are-now', re: /\b(?:you\s+are\s+now|from\s+now\s+on\s+you\s+are|tu\s+es\s+(?:maintenant|désormais)|vous\s+êtes\s+(?:maintenant|désormais))\s+(?:a|an|un|une|my|mon|ma|in|en)\b/i },
  { name: 'reveal-prompt', re: /\b(?:reveal|show|print|display|repeat|output|révèle|répète|affiche|montre|donne)(?:\s+\S+){0,2}?\s+(?:your|tes|vos|ton|votre)(?:\s+\S+){0,2}?\s+(?:system\s+prompt|instructions?|prompts?|rules?|consignes?|règles?)/i },
  { name: 'ask-instructions', re: /\b(?:what\s+are\s+your(?:\s+\S+){0,2}\s+(?:instructions?|rules?|prompts?)|quelles\s+sont\s+tes\s+(?:instructions|consignes|règles))/i },
  { name: 'jailbreak-dan', re: /\bDAN\b/ },
  { name: 'jailbreak-persona', re: /\b(?:developer\s+mode|jailbreak|no\s+restrictions?|mode\s+développeur|sans\s+(?:aucune\s+)?restrictions?)\b/i },
  { name: 'tag-spoof', re: /<\/?\s*(?:instructions?|system|tool-result|attachment|steering)\b[^>]*>/i },
  { name: 'he-ignore-instructions', re: /(?:התעלם|התעלמי|התעלמו|תתעלם|שכח|שכחי|תשכח)\S*(?:\s+\S+){0,4}?\s+\S*(?:הוראות|הנחיות|כללים|פרומפט)/u },
  { name: 'he-reveal-prompt', re: /(?:הצג|תציג|הראה|תראה|חשוף|תחשוף|הדפס|תדפיס|כתוב|תכתוב)\S*(?:\s+\S+){0,3}?\s+\S*(?:הוראות|הנחיות|פרומפט)\S*\s+(?:שלך|שלכם|המערכת|מערכת)/u },
  { name: 'he-persona', re: /(?:מעכשיו\s+אתה|אתה\s+מעכשיו|תעמיד\s+פנים|העמד\s+פנים|תתנהג\s+כמו|מצב\s+מפתח|ללא\s+הגבלות|בלי\s+הגבלות)/u },
  { name: 'he-new-instructions', re: /הוראות\s+חדשות\s*:/u },
];

const BASE64_BLOB = /[A-Za-z0-9+/=]{100,}/;
const INVISIBLE = /[\u200B-\u200F\u2060-\u2064\uFEFF\u00AD]/g;
const LEET: Record<string, string> = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };

// The text the patterns read: invisible characters removed, letters folded to their compatibility form,
// and digits used as letters inside words read as those letters.
export function normalizeForMatching(text: string): string {
  const folded = text.normalize('NFKC').replace(INVISIBLE, '');
  return folded.replace(/\S+/g, (word) => (/\p{L}/u.test(word)
    ? word.replace(/[013457@$]/g, (character) => LEET[character])
    : word));
}

export function validateQuestion(raw: string, policy: GuardPolicy = {}): QuestionVerdict {
  const question = raw.trim();
  if (!question) {
    return { ok: false, reason: 'empty' };
  }
  if (question.length > (policy.maxInputLength ?? DEFAULT_MAX_INPUT_LENGTH)) {
    return { ok: false, reason: 'too-long' };
  }
  if (BASE64_BLOB.test(question)) {
    return { ok: false, reason: 'injection', pattern: 'base64-blob' };
  }
  return matchInjection(question);
}

function matchInjection(text: string): QuestionVerdict {
  const normalized = normalizeForMatching(text);
  const hit = INJECTION_PATTERNS.find(({ re }) => re.test(text) || re.test(normalized));
  return hit ? { ok: false, reason: 'injection', pattern: hit.name } : { ok: true };
}

function validateAttachedText(texts: string[], policy: GuardPolicy): QuestionVerdict {
  const length = texts.reduce((total, text) => total + text.length, 0);
  if (length > (policy.maxAttachmentText ?? DEFAULT_MAX_ATTACHMENT_TEXT)) {
    return { ok: false, reason: 'too-long' };
  }
  for (const text of texts) {
    const verdict = matchInjection(text);
    if (!verdict.ok) {
      return verdict;
    }
  }
  return { ok: true };
}

// A question with its attachments: the typed text under `validateQuestion`, and the attached text under
// its own cap and the injection patterns. An image or a file alone makes a question.
export function validateContent(content: string | ContentPart[], policy: GuardPolicy = {}): QuestionVerdict {
  const parts = contentParts(content);
  const typed = textOf(parts);
  const attached = parts.some((part) => part.type !== 'text');
  if (typed.trim() || !attached) {
    const verdict = validateQuestion(typed, policy);
    if (!verdict.ok) {
      return verdict;
    }
  }
  return validateAttachedText(attachedText(parts), policy);
}
