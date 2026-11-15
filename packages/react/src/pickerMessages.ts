// The copy of the connect window in each built in language. A site passes `locale`, or its own
// `messages`, to match its voice. `dir` sets the reading direction for the language.

import type { WalletRefusal } from '@tensorpass/aiconnect';

// The step after a connection that did not go through: what happened and the action that continues.
export interface RefusalStep {
  title: string;
  // Empty for `failed`, whose text is the wallet's own message.
  text: string;
  action: string;
}

// The step on an iPhone without the wallet, which comes with the AI Wallet app. Safari gets the app; another
// browser opens the page again in Safari or in the app's own browser, or in the app alone before iOS 17.
export interface PhoneMessages {
  appTitle: string;
  appText: string;
  appButton: string;
  switchTitle: string;
  switchText: string;
  appOnlyTitle: string;
  appOnlyText: string;
  safariButton: string;
  appBrowserButton: string;
}

export interface PickerMessages {
  dir: 'ltr' | 'rtl';
  title: string;
  close: string;
  back: string;
  help: string;
  aboutTitle: string;
  aboutPoints: string[];
  checking: string;
  connectTitle: string;
  connectText: string;
  connectButton: string;
  waitingTitle: string;
  waitingText: string;
  installTitle: string;
  // The install step's text, with the visitor's browser named in Latin script, or `undefined` for a browser
  // the wallet does not name.
  installText: (browser: string | undefined) => string;
  // The install button when the visitor's browser is known, with the browser's name in Latin script;
  // `installButton` names it for any other browser.
  addToBrowser: (browser: string) => string;
  installButton: string;
  // Under the install button in Safari, for a visitor who added the wallet and has not allowed it on
  // every website yet: Safari runs it only on the sites the visitor allowed, so this site cannot find it.
  // The wallet's popover then leads with the button that allows it on every website.
  safariAlreadyAdded: string;
  phone: PhoneMessages;
  // By the reason the wallet gave; `failed` covers every other failure.
  refusals: Record<WalletRefusal | 'failed', RefusalStep>;
}

const en: PickerMessages = {
  dir: 'ltr',
  title: 'Connect your AI',
  close: 'Close',
  back: 'Back',
  help: 'How it works',
  aboutTitle: 'Your AI, on this site',
  aboutPoints: [
    'Your AI accounts stay in the AI Wallet extension, on your computer.',
    'This site asks the wallet for answers and never sees your keys or your other conversations.',
    'You choose the account for each site, and switch the site off from the wallet at any time.',
  ],
  checking: 'Looking for AI Wallet',
  connectTitle: 'Use your own AI here',
  connectText: 'AI Wallet answers this site with the AI plan you already pay for.',
  connectButton: 'Connect AI Wallet',
  waitingTitle: 'Continue in AI Wallet',
  waitingText: 'Its window is open. This page continues on its own.',
  installTitle: 'Use your ChatGPT, Claude or Gemini plan here',
  installText: (browser) => `Add AI Wallet to ${browser ?? 'your browser'} and this site answers with the AI plan `
    + 'you already pay for: ChatGPT, Claude, Gemini, Grok and more.',
  addToBrowser: (browser) => `Add to ${browser}`,
  installButton: 'Install AI Wallet',
  safariAlreadyAdded: 'Already added? Click AI Wallet in Safari\'s toolbar and choose Always Allow on Every '
    + 'Website.',
  phone: {
    appTitle: 'Use your AI on this iPhone',
    appText: 'AI Wallet keeps your AI accounts on this iPhone and answers the sites you approve. '
      + 'Install the app and allow it in Safari to use your AI here.',
    appButton: 'Get the AI Wallet app',
    switchTitle: 'Continue in Safari or in AI Wallet',
    switchText: 'On an iPhone, AI Wallet answers sites in Safari and in its own app. Open this page in either one.',
    appOnlyTitle: 'Continue in AI Wallet',
    appOnlyText: 'On an iPhone, AI Wallet answers sites in its own app. Open this page there.',
    safariButton: 'Open in Safari',
    appBrowserButton: 'Open in AI Wallet',
  },
  refusals: {
    declined: {
      title: 'You declined this site',
      text: 'To use your AI here, connect again and approve the site in AI Wallet.',
      action: 'Connect again',
    },
    closed: {
      title: 'AI Wallet\'s window was closed',
      text: 'Open it again to finish connecting this site.',
      action: 'Open AI Wallet',
    },
    interrupted: {
      title: 'AI Wallet stopped before the end',
      text: 'Open it again to finish connecting this site.',
      action: 'Open AI Wallet',
    },
    failed: { title: 'AI Wallet could not connect', text: '', action: 'Try again' },
  },
};

const fr: PickerMessages = {
  dir: 'ltr',
  title: 'Connectez votre IA',
  close: 'Fermer',
  back: 'Retour',
  help: 'Comment ça marche',
  aboutTitle: 'Votre IA, sur ce site',
  aboutPoints: [
    'Vos comptes d\'IA restent dans l\'extension AI Wallet, sur votre ordinateur.',
    'Ce site demande ses réponses au portefeuille et ne voit ni vos clés ni vos autres conversations.',
    'Vous choisissez le compte de chaque site, et vous coupez un site depuis le portefeuille à tout moment.',
  ],
  checking: 'Recherche d\'AI Wallet',
  connectTitle: 'Utilisez votre propre IA ici',
  connectText: 'AI Wallet répond à ce site avec l\'abonnement d\'IA que vous payez déjà.',
  connectButton: 'Connecter AI Wallet',
  waitingTitle: 'Continuez dans AI Wallet',
  waitingText: 'Sa fenêtre est ouverte. Cette page continue toute seule.',
  installTitle: 'Utilisez ici votre abonnement ChatGPT, Claude ou Gemini',
  installText: (browser) => `Ajoutez AI Wallet à ${browser ?? 'votre navigateur'} et ce site répond avec `
    + 'l\'abonnement d\'IA que vous payez déjà : ChatGPT, Claude, Gemini, Grok et d\'autres.',
  addToBrowser: (browser) => `Ajouter à ${browser}`,
  installButton: 'Installer AI Wallet',
  safariAlreadyAdded: 'Déjà ajouté ? Cliquez sur AI Wallet dans la barre d\'outils de Safari et choisissez Toujours '
    + 'autoriser sur tous les sites web.',
  phone: {
    appTitle: 'Utilisez votre IA sur cet iPhone',
    appText: 'AI Wallet garde vos comptes d\'IA sur cet iPhone et répond aux sites que vous approuvez. '
      + 'Installez l\'app et autorisez-la dans Safari pour utiliser votre IA ici.',
    appButton: 'Obtenir l\'app AI Wallet',
    switchTitle: 'Continuez dans Safari ou dans AI Wallet',
    switchText: 'Sur iPhone, AI Wallet répond aux sites dans Safari et dans sa propre app. '
      + 'Ouvrez cette page dans l\'un des deux.',
    appOnlyTitle: 'Continuez dans AI Wallet',
    appOnlyText: 'Sur iPhone, AI Wallet répond aux sites dans sa propre app. Ouvrez cette page dans l\'app.',
    safariButton: 'Ouvrir dans Safari',
    appBrowserButton: 'Ouvrir dans AI Wallet',
  },
  refusals: {
    declined: {
      title: 'Vous avez refusé ce site',
      text: 'Pour utiliser votre IA ici, connectez à nouveau et approuvez le site dans AI Wallet.',
      action: 'Connecter à nouveau',
    },
    closed: {
      title: 'La fenêtre d\'AI Wallet a été fermée',
      text: 'Rouvrez-la pour finir de connecter ce site.',
      action: 'Ouvrir AI Wallet',
    },
    interrupted: {
      title: 'AI Wallet s\'est arrêté avant la fin',
      text: 'Rouvrez-le pour finir de connecter ce site.',
      action: 'Ouvrir AI Wallet',
    },
    failed: { title: 'AI Wallet n\'a pas pu se connecter', text: '', action: 'Réessayer' },
  },
};

const he: PickerMessages = {
  dir: 'rtl',
  title: 'חברו את הבינה המלאכותית שלכם',
  close: 'סגירה',
  back: 'חזרה',
  help: 'איך זה עובד',
  aboutTitle: 'הבינה המלאכותית שלכם, באתר הזה',
  aboutPoints: [
    'חשבונות הבינה המלאכותית שלכם נשארים בתוסף AI Wallet, במחשב שלכם.',
    'האתר מבקש תשובות מהארנק ואינו רואה את המפתחות שלכם או שיחות אחרות.',
    'אתם בוחרים חשבון לכל אתר, ומנתקים אתר מהארנק בכל רגע.',
  ],
  checking: 'מחפשים את AI Wallet',
  connectTitle: 'השתמשו כאן בבינה המלאכותית שלכם',
  connectText: 'AI Wallet עונה לאתר הזה עם המנוי שאתם כבר משלמים עליו.',
  connectButton: 'חיבור AI Wallet',
  waitingTitle: 'המשיכו ב AI Wallet',
  waitingText: 'החלון שלו פתוח. הדף ימשיך מעצמו.',
  installTitle: 'השתמשו כאן במנוי ChatGPT, Claude או Gemini שלכם',
  installText: (browser) => `הוסיפו את AI Wallet לדפדפן ${browser ?? 'שלכם'} והאתר יענה עם מנוי הבינה המלאכותית `
    + 'שאתם כבר משלמים עליו: ChatGPT, Claude, Gemini, Grok ועוד.',
  addToBrowser: (browser) => `הוספה לדפדפן ${browser}`,
  installButton: 'התקנת AI Wallet',
  safariAlreadyAdded: 'כבר הוספתם? לחצו על AI Wallet בסרגל הכלים של Safari ובחרו „תמיד לאשר בכל האתרים”.',
  phone: {
    appTitle: 'השתמשו בבינה המלאכותית שלכם באייפון הזה',
    appText: 'AI Wallet שומר את חשבונות הבינה המלאכותית שלכם באייפון הזה ועונה לאתרים שאתם מאשרים. '
      + 'התקינו את האפליקציה ואפשרו אותה ב Safari כדי להשתמש כאן בבינה המלאכותית שלכם.',
    appButton: 'הורדת האפליקציה AI Wallet',
    switchTitle: 'המשיכו ב Safari או ב AI Wallet',
    switchText: 'באייפון, AI Wallet עונה לאתרים ב Safari ובאפליקציה שלו. פתחו את הדף באחד מהם.',
    appOnlyTitle: 'המשיכו ב AI Wallet',
    appOnlyText: 'באייפון, AI Wallet עונה לאתרים באפליקציה שלו. פתחו את הדף שם.',
    safariButton: 'פתיחה ב Safari',
    appBrowserButton: 'פתיחה ב AI Wallet',
  },
  refusals: {
    declined: {
      title: 'דחיתם את האתר הזה',
      text: 'כדי להשתמש כאן בבינה המלאכותית שלכם, התחברו שוב ואשרו את האתר ב AI Wallet.',
      action: 'התחברות מחדש',
    },
    closed: {
      title: 'החלון של AI Wallet נסגר',
      text: 'פתחו אותו שוב כדי לסיים לחבר את האתר.',
      action: 'פתיחת AI Wallet',
    },
    interrupted: {
      title: 'AI Wallet נעצר לפני הסוף',
      text: 'פתחו אותו שוב כדי לסיים לחבר את האתר.',
      action: 'פתיחת AI Wallet',
    },
    failed: { title: 'AI Wallet לא הצליח להתחבר', text: '', action: 'ניסיון נוסף' },
  },
};

const ar: PickerMessages = {
  dir: 'rtl',
  title: 'اربط الذكاء الاصطناعي الخاص بك',
  close: 'إغلاق',
  back: 'رجوع',
  help: 'كيف يعمل',
  aboutTitle: 'الذكاء الاصطناعي الخاص بك، على هذا الموقع',
  aboutPoints: [
    'تبقى حسابات الذكاء الاصطناعي الخاصة بك في إضافة AI Wallet، على جهاز الكمبيوتر الخاص بك.',
    'يطلب هذا الموقع الإجابات من المحفظة ولا يرى مفاتيحك أو محادثاتك الأخرى.',
    'تختار الحساب لكل موقع، ويمكنك إيقاف الموقع من المحفظة في أي وقت.',
  ],
  checking: 'جارٍ البحث عن AI Wallet',
  connectTitle: 'استخدم الذكاء الاصطناعي الخاص بك هنا',
  connectText: 'يجيب AI Wallet على هذا الموقع باشتراك الذكاء الاصطناعي الذي تدفع ثمنه بالفعل.',
  connectButton: 'ربط AI Wallet',
  waitingTitle: 'تابع في AI Wallet',
  waitingText: 'نافذته مفتوحة. ستتابع هذه الصفحة من تلقاء نفسها.',
  installTitle: 'استخدم هنا اشتراكك في ChatGPT أو Claude أو Gemini',
  installText: (browser) => `أضف AI Wallet إلى ${browser ?? 'متصفحك'} وسيجيب هذا الموقع باشتراك الذكاء الاصطناعي `
    + 'الذي تدفع ثمنه بالفعل: ChatGPT وClaude وGemini وGrok وغيرها.',
  addToBrowser: (browser) => `إضافة إلى ${browser}`,
  installButton: 'تثبيت AI Wallet',
  safariAlreadyAdded: 'هل أضفته من قبل؟ انقر على AI Wallet في شريط أدوات Safari واختر «السماح دائمًا على كل '
    + 'مواقع الويب».',
  phone: {
    appTitle: 'استخدم الذكاء الاصطناعي الخاص بك على هذا الآيفون',
    appText: 'يحتفظ AI Wallet بحسابات الذكاء الاصطناعي الخاصة بك على هذا الآيفون ويجيب على المواقع التي توافق عليها. '
      + 'ثبّت التطبيق واسمح له في Safari لاستخدام الذكاء الاصطناعي الخاص بك هنا.',
    appButton: 'احصل على تطبيق AI Wallet',
    switchTitle: 'تابع في Safari أو في AI Wallet',
    switchText: 'على الآيفون، يجيب AI Wallet على المواقع في Safari وفي تطبيقه الخاص. افتح هذه الصفحة في أحدهما.',
    appOnlyTitle: 'تابع في AI Wallet',
    appOnlyText: 'على الآيفون، يجيب AI Wallet على المواقع في تطبيقه الخاص. افتح هذه الصفحة فيه.',
    safariButton: 'فتح في Safari',
    appBrowserButton: 'فتح في AI Wallet',
  },
  refusals: {
    declined: {
      title: 'لقد رفضت هذا الموقع',
      text: 'لاستخدام الذكاء الاصطناعي الخاص بك هنا، أعد الربط ووافق على الموقع في AI Wallet.',
      action: 'إعادة الربط',
    },
    closed: {
      title: 'أُغلقت نافذة AI Wallet',
      text: 'افتحها مرة أخرى لإكمال ربط هذا الموقع.',
      action: 'فتح AI Wallet',
    },
    interrupted: {
      title: 'توقف AI Wallet قبل النهاية',
      text: 'افتحه مرة أخرى لإكمال ربط هذا الموقع.',
      action: 'فتح AI Wallet',
    },
    failed: { title: 'تعذّر على AI Wallet الاتصال', text: '', action: 'إعادة المحاولة' },
  },
};

const zh: PickerMessages = {
  dir: 'ltr',
  title: '连接你的 AI',
  close: '关闭',
  back: '返回',
  help: '工作原理',
  aboutTitle: '你的 AI，用在这个网站上',
  aboutPoints: [
    '你的 AI 账户保存在你电脑上的 AI Wallet 扩展中。',
    '这个网站向钱包请求回答，看不到你的密钥和你的其他对话。',
    '你为每个网站选择账户，并可随时在钱包中关闭某个网站。',
  ],
  checking: '正在查找 AI Wallet',
  connectTitle: '在这里使用你自己的 AI',
  connectText: 'AI Wallet 用你已经付费的 AI 订阅来回答这个网站。',
  connectButton: '连接 AI Wallet',
  waitingTitle: '在 AI Wallet 中继续',
  waitingText: '它的窗口已打开。此页面会自动继续。',
  installTitle: '在这里使用你的 ChatGPT、Claude 或 Gemini 订阅',
  installText: (browser) => `把 AI Wallet 添加到${browser ? ` ${browser} ` : '你的浏览器'}后，`
    + '这个网站就会用你已经付费的 AI 订阅来回答：ChatGPT、Claude、Gemini、Grok 等。',
  addToBrowser: (browser) => `添加至 ${browser}`,
  installButton: '安装 AI Wallet',
  safariAlreadyAdded: '已经添加过？点按 Safari 工具栏中的 AI Wallet，然后选择“在所有网站上始终允许”。',
  phone: {
    appTitle: '在这台 iPhone 上使用你的 AI',
    appText: 'AI Wallet 把你的 AI 账户保存在这台 iPhone 上，并回答你批准的网站。安装这个 App 并在 Safari 中允许它，即可在这里使用你的 AI。',
    appButton: '获取 AI Wallet App',
    switchTitle: '在 Safari 或 AI Wallet 中继续',
    switchText: '在 iPhone 上，AI Wallet 可以在 Safari 和它自己的 App 中回答网站。请在其中之一打开此页面。',
    appOnlyTitle: '在 AI Wallet 中继续',
    appOnlyText: '在 iPhone 上，AI Wallet 在它自己的 App 中回答网站。请在那里打开此页面。',
    safariButton: '在 Safari 中打开',
    appBrowserButton: '在 AI Wallet 中打开',
  },
  refusals: {
    declined: {
      title: '你拒绝了这个网站',
      text: '要在这里使用你的 AI，请重新连接，并在 AI Wallet 中批准这个网站。',
      action: '重新连接',
    },
    closed: {
      title: 'AI Wallet 的窗口已关闭',
      text: '再次打开它，完成连接这个网站。',
      action: '打开 AI Wallet',
    },
    interrupted: {
      title: 'AI Wallet 在完成前停止了',
      text: '再次打开它，完成连接这个网站。',
      action: '打开 AI Wallet',
    },
    failed: { title: 'AI Wallet 无法连接', text: '', action: '重试' },
  },
};

export const builtInMessages = { en, fr, he, ar, zh };

export type Locale = keyof typeof builtInMessages;
