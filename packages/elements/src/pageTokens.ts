// The --aic-* tokens set on the page itself, once, by the first element or by the loader. They go first
// in the head, so the site's own values, set later on :root or any ancestor of an element, take
// precedence and reach the elements' shadow roots by inheritance.

import tokens from '@tensorpass/aiconnect-design/tokens.css';

const TOKENS_ID = 'aiconnect-tokens';

export function addPageTokens(): void {
  if (document.getElementById(TOKENS_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = TOKENS_ID;
  style.textContent = tokens;
  document.head.prepend(style);
}
