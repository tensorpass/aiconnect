// The colour of each account's key card, shared by the AI Wallet and the website. Provider marks
// keep their own colours on the card's white chip; the card itself takes a tint, with ink or white
// text so it stays readable.

export interface CardTint {
  surface: string;
  text: string;
  // The shadow under the card, from its own hue.
  glow: string;
}

const INK = '#0b0d12';
const WHITE = '#ffffff';

const tint = (surface: string, text: string, glow: string): CardTint => ({ surface, text, glow });

const TINTS: Record<string, CardTint> = {
  chatgpt: tint('#2838d8', WHITE, 'rgba(40, 56, 216, 0.7)'),
  claude: tint('#f8c9b8', INK, 'rgba(214, 120, 84, 0.65)'),
  gemini: tint('#c9c7f8', INK, 'rgba(110, 96, 220, 0.55)'),
  grok: tint('#3a3d46', WHITE, 'rgba(20, 22, 28, 0.6)'),
  openrouter: tint('#5b5ff0', WHITE, 'rgba(91, 95, 240, 0.6)'),
  qwen: tint('#d6deff', INK, 'rgba(90, 110, 220, 0.5)'),
  kimi: tint('#e4e4e7', INK, 'rgba(60, 60, 70, 0.4)'),
  glm: tint('#cfe0ff', INK, 'rgba(70, 120, 220, 0.5)'),
  minimax: tint('#ffd3db', INK, 'rgba(220, 80, 110, 0.5)'),
  muse: tint('#d2e2ff', INK, 'rgba(50, 110, 230, 0.5)'),
  mimo: tint('#ffe0c4', INK, 'rgba(230, 120, 40, 0.5)'),
  codebuddy: tint('#ddd6ff', INK, 'rgba(110, 80, 230, 0.5)'),
  nous: tint('#e7e1d4', INK, 'rgba(110, 95, 60, 0.45)'),
  'anthropic-key': tint('#f3b49c', INK, 'rgba(214, 120, 84, 0.6)'),
  'openai-key': tint('#b8e8d6', INK, 'rgba(16, 140, 100, 0.5)'),
  'gemini-key': tint('#b9b6f3', INK, 'rgba(110, 96, 220, 0.55)'),
  'mistral-key': tint('#ffd0a3', INK, 'rgba(240, 120, 30, 0.5)'),
  'deepseek-key': tint('#c6d3ff', INK, 'rgba(77, 107, 254, 0.5)'),
  'nvidia-key': tint('#cfe9a8', INK, 'rgba(118, 185, 0, 0.5)'),
  'perplexity-key': tint('#c3e8ec', INK, 'rgba(30, 140, 160, 0.5)'),
};

const OTHER = tint('#e6e8ec', INK, 'rgba(40, 44, 52, 0.4)');

export const AUTO_TINT = tint('#15161a', WHITE, 'rgba(0, 0, 0, 0.6)');

export function tintOf(providerId: string): CardTint {
  return TINTS[providerId] ?? OTHER;
}
