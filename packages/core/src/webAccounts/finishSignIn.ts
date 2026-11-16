// The site's return page of a web sign in, the address a site passes as `signInCallback`. It does one
// thing on load: in the popup, it hands the provider's answer to the page that opened it and closes; in the
// tab of a sign in the browser kept out of a popup, it sends the tab back to the page the sign in started
// from, whose client finishes it. A popup the browser does not let close shows one line saying so. It
// imports nothing else of the SDK, so the page stays small.

import { answerIn, redirectedSignIn, returnToOpener, windowMark, withAnswer } from './signInWindow.ts';

// The line a popup shows when the browser keeps it open, in the languages of the connect window.
const CLOSE_LINES: Record<string, string> = {
  en: 'You are signed in. You can close this window.',
  fr: 'Vous êtes connecté. Vous pouvez fermer cette fenêtre.',
  he: 'התחברתם. אפשר לסגור את החלון הזה.',
  ar: 'تم تسجيل دخولك. يمكنك إغلاق هذه النافذة.',
  zh: '你已登录。可以关闭此窗口。',
};

export type SignInReturn = 'window' | 'redirect' | 'none';

function closeLine(): string {
  const language = (globalThis.navigator?.language ?? 'en').slice(0, 2);
  return CLOSE_LINES[language] ?? CLOSE_LINES.en;
}

function showCloseLine(): void {
  const line = document.createElement('p');
  line.textContent = closeLine();
  line.style.cssText = 'margin:40px auto;max-width:28em;padding:0 16px;font:16px/1.5 system-ui,sans-serif;'
    + 'text-align:center';
  document.body.replaceChildren(line);
}

// Runs on the return page's load and answers what the page was: a popup's return, a tab's return, or a
// visit with no sign in waiting, which leaves the page as it is.
export function finishSignIn(): SignInReturn {
  const mark = windowMark();
  const answer = mark ? answerIn(location.href, mark) : null;
  if (answer) {
    returnToOpener(answer);
    if (!window.closed) {
      showCloseLine();
    }
    return 'window';
  }
  const pending = redirectedSignIn();
  const returned = pending ? answerIn(location.href, pending.state) : null;
  if (!pending || !returned) {
    return 'none';
  }
  location.replace(withAnswer(pending.returnTo, returned));
  return 'redirect';
}
