// The copy of the web accounts in each built in language: the sign ins a visitor without the wallet is
// offered, the step while the sign in window is open, why a sign in did not go through, and the account
// that answers once signed in. `{account}` stands for the account's name, such as OpenRouter. A site
// passes `webMessages` to the provider to word them its own way.

import type { WebAccountId, WebSignInFailure } from '@tensorpass/aiconnect';
import type { Locale } from './pickerMessages.ts';

export interface WebAccountMessages {
  offerTitle: string;
  signInWith: string;
  signingInTitle: string;
  signingInText: string;
  cancel: string;
  answers: Record<WebAccountId, string>;
  // Under the account that answers: where the sign in lives, and who can read it.
  storedText: string;
  signOut: string;
  failures: Record<WebSignInFailure['reason'], string>;
  // The chat's offer to subscribe when the TensorPass account has no plan. `{plan}` stands for the plan's
  // name and `{price}` for its monthly price.
  plan: PlanOfferMessages;
}

export interface PlanOfferMessages {
  title: string;
  text: string;
  choose: string;
  perMonth: string;
  waiting: string;
  failed: string;
}

const en: WebAccountMessages = {
  offerTitle: 'No extension? Use an account here',
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
  plan: {
    title: 'Your TensorPass account has no plan yet',
    text: 'Choose a plan to get the answer here. Your question is kept and answered once the plan is active.',
    choose: 'Choose {plan}',
    perMonth: '{price} a month',
    waiting: 'Finish in the TensorPass tab. This chat answers once the plan is active.',
    failed: 'TensorPass did not send its plans. Try again.',
  },
};

const fr: WebAccountMessages = {
  offerTitle: 'Sans extension ? Utilisez un compte ici',
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
  plan: {
    title: 'Votre compte TensorPass n\'a pas encore d\'abonnement',
    text: 'Choisissez un abonnement pour obtenir la réponse ici. Votre question est gardée et reçoit sa réponse '
      + 'dès que l\'abonnement est actif.',
    choose: 'Choisir {plan}',
    perMonth: '{price} par mois',
    waiting: 'Terminez dans l\'onglet TensorPass. Ce chat répond dès que l\'abonnement est actif.',
    failed: 'TensorPass n\'a pas envoyé ses abonnements. Réessayez.',
  },
};

const he: WebAccountMessages = {
  offerTitle: 'אין תוסף? השתמשו כאן בחשבון',
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
  plan: {
    title: 'לחשבון TensorPass שלכם עדיין אין מנוי',
    text: 'בחרו מנוי כדי לקבל את התשובה כאן. השאלה שלכם נשמרת ותיענה ברגע שהמנוי פעיל.',
    choose: 'בחירת {plan}',
    perMonth: '{price} לחודש',
    waiting: 'סיימו בלשונית של TensorPass. הצ׳אט יענה ברגע שהמנוי פעיל.',
    failed: 'TensorPass לא שלח את המנויים. נסו שוב.',
  },
};

const ar: WebAccountMessages = {
  offerTitle: 'لا توجد إضافة؟ استخدم حسابًا هنا',
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
  plan: {
    title: 'لا يملك حسابك في TensorPass اشتراكًا بعد',
    text: 'اختر اشتراكًا لتحصل على الإجابة هنا. سؤالك محفوظ وستتم الإجابة عنه فور تفعيل الاشتراك.',
    choose: 'اختيار {plan}',
    perMonth: '{price} شهريًا',
    waiting: 'أكمل في علامة تبويب TensorPass. ستجيب هذه المحادثة فور تفعيل الاشتراك.',
    failed: 'لم يرسل TensorPass اشتراكاته. أعد المحاولة.',
  },
};

const zh: WebAccountMessages = {
  offerTitle: '没有扩展？在这里使用一个账户',
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
  plan: {
    title: '你的 TensorPass 账户还没有订阅',
    text: '选择一个订阅即可在这里获得回答。你的问题会被保留，订阅生效后就会得到回答。',
    choose: '选择 {plan}',
    perMonth: '每月 {price}',
    waiting: '请在 TensorPass 标签页中完成。订阅生效后，这个聊天就会回答。',
    failed: 'TensorPass 没有发送订阅信息。请重试。',
  },
};

export const builtInWebMessages: Record<Locale, WebAccountMessages> = { en, fr, he, ar, zh };

// A message with the account's name in place of `{account}`.
export function withAccount(message: string, accountName: string): string {
  return message.replaceAll('{account}', accountName);
}
