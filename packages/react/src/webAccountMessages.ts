// The copy of the web accounts in each built in language: the sign ins a visitor without the wallet is
// offered, the step while the sign in window is open, why a sign in did not go through, and the account
// that answers once signed in. `{account}` stands for the account's name, such as OpenRouter. A site
// passes `webMessages` to the provider to word them its own way.

import type { WebAccountId, WebSignInFailure } from '@tensorpass/aiconnect';
import type { Locale } from './pickerMessages.ts';

export interface WebAccountMessages {
  offerTitle: string;
  offerText: string;
  signInWith: string;
  signingInTitle: string;
  signingInText: string;
  cancel: string;
  answers: Record<WebAccountId, string>;
  // Under the account that answers: where the sign in lives, and who can read it.
  storedText: string;
  signOut: string;
  failures: Record<WebSignInFailure['reason'], string>;
}

const en: WebAccountMessages = {
  offerTitle: 'No extension? Sign in here',
  offerText: 'This site can answer with an account you sign in to on this page.',
  signInWith: 'Sign in with {account}',
  signingInTitle: 'Continue in the {account} window',
  signingInText: 'Sign in there. This page continues on its own.',
  cancel: 'Cancel',
  answers: { tensorpass: 'Your TensorPass plan answers', openrouter: 'Your OpenRouter account answers' },
  storedText: 'This site keeps your sign in in this browser, and the site\'s scripts can read it. The AI Wallet '
    + 'extension keeps its accounts out of a site\'s reach.',
  signOut: 'Sign out',
  failures: {
    declined: 'You cancelled the sign in to {account}.',
    failed: '{account} did not finish the sign in. Try again.',
    expired: 'The sign in to {account} took too long. Try again.',
  },
};

const fr: WebAccountMessages = {
  offerTitle: 'Sans extension ? Connectez-vous ici',
  offerText: 'Ce site peut répondre avec un compte auquel vous vous connectez sur cette page.',
  signInWith: 'Se connecter avec {account}',
  signingInTitle: 'Continuez dans la fenêtre de {account}',
  signingInText: 'Connectez-vous dans cette fenêtre. Cette page continue toute seule.',
  cancel: 'Annuler',
  answers: { tensorpass: 'Votre abonnement TensorPass répond', openrouter: 'Votre compte OpenRouter répond' },
  storedText: 'Ce site garde votre connexion dans ce navigateur, et ses scripts peuvent la lire. L\'extension AI '
    + 'Wallet garde ses comptes hors de portée des sites.',
  signOut: 'Se déconnecter',
  failures: {
    declined: 'Vous avez annulé la connexion à {account}.',
    failed: '{account} n\'a pas terminé la connexion. Réessayez.',
    expired: 'La connexion à {account} a pris trop de temps. Réessayez.',
  },
};

const he: WebAccountMessages = {
  offerTitle: 'אין תוסף? התחברו כאן',
  offerText: 'האתר יכול לענות עם חשבון שאתם מתחברים אליו בדף הזה.',
  signInWith: 'התחברות עם {account}',
  signingInTitle: 'המשיכו בחלון של {account}',
  signingInText: 'התחברו בחלון הזה. הדף ימשיך מעצמו.',
  cancel: 'ביטול',
  answers: { tensorpass: 'המנוי שלכם ב TensorPass עונה', openrouter: 'החשבון שלכם ב OpenRouter עונה' },
  storedText: 'האתר שומר את ההתחברות שלכם בדפדפן הזה, והסקריפטים של האתר יכולים לקרוא אותה. התוסף AI Wallet '
    + 'שומר את החשבונות שלו מחוץ להישג ידם של אתרים.',
  signOut: 'התנתקות',
  failures: {
    declined: 'ביטלתם את ההתחברות ל {account}.',
    failed: '{account} לא השלים את ההתחברות. נסו שוב.',
    expired: 'ההתחברות ל {account} ארכה זמן רב מדי. נסו שוב.',
  },
};

const ar: WebAccountMessages = {
  offerTitle: 'لا توجد إضافة؟ سجّل الدخول هنا',
  offerText: 'يمكن لهذا الموقع أن يجيب بحساب تسجّل الدخول إليه في هذه الصفحة.',
  signInWith: 'تسجيل الدخول باستخدام {account}',
  signingInTitle: 'تابع في نافذة {account}',
  signingInText: 'سجّل الدخول في تلك النافذة. ستتابع هذه الصفحة من تلقاء نفسها.',
  cancel: 'إلغاء',
  answers: { tensorpass: 'اشتراكك في TensorPass يجيب', openrouter: 'حسابك في OpenRouter يجيب' },
  storedText: 'يحتفظ هذا الموقع بتسجيل دخولك في هذا المتصفح، ويمكن لنصوص الموقع البرمجية قراءته. تحتفظ إضافة '
    + 'AI Wallet بحساباتها بعيدًا عن متناول المواقع.',
  signOut: 'تسجيل الخروج',
  failures: {
    declined: 'لقد ألغيت تسجيل الدخول إلى {account}.',
    failed: 'لم يُكمل {account} تسجيل الدخول. أعد المحاولة.',
    expired: 'استغرق تسجيل الدخول إلى {account} وقتًا طويلًا. أعد المحاولة.',
  },
};

const zh: WebAccountMessages = {
  offerTitle: '没有扩展？在这里登录',
  offerText: '这个网站可以用你在此页面登录的账户来回答。',
  signInWith: '使用 {account} 登录',
  signingInTitle: '在 {account} 窗口中继续',
  signingInText: '请在那个窗口中登录。此页面会自动继续。',
  cancel: '取消',
  answers: { tensorpass: '你的 TensorPass 订阅正在回答', openrouter: '你的 OpenRouter 账户正在回答' },
  storedText: '这个网站把你的登录保存在此浏览器中，网站的脚本可以读取它。AI Wallet 扩展把它的账户保存在网站无法触及的地方。',
  signOut: '退出登录',
  failures: {
    declined: '你取消了 {account} 登录。',
    failed: '{account} 未能完成登录。请重试。',
    expired: '{account} 登录耗时过长。请重试。',
  },
};

export const builtInWebMessages: Record<Locale, WebAccountMessages> = { en, fr, he, ar, zh };

// A message with the account's name in place of `{account}`.
export function withAccount(message: string, accountName: string): string {
  return message.replaceAll('{account}', accountName);
}
