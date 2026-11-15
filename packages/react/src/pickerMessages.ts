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
  installText: string;
  // The install button when the visitor's browser is known, with the browser's name in Latin script;
  // `installButton` names it for any other browser.
  addToBrowser: (browser: string) => string;
  installButton: string;
  // Under the install button in Safari, for a visitor who added the wallet and has not allowed it on
  // every website yet: Safari runs it only on the sites the visitor allowed, so this site cannot find it.
  // The wallet's popover then leads with the button that allows it on every website.
  safariAlreadyAdded: string;
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
  installTitle: 'Add AI Wallet to your browser',
  installText: 'The AI Wallet extension keeps your AI accounts and connects them to the sites you approve. '
    + 'Reload this page once it is installed.',
  addToBrowser: (browser) => `Add to ${browser}`,
  installButton: 'Install AI Wallet',
  safariAlreadyAdded: 'Already added? Click AI Wallet in Safari\'s toolbar, then Allow on every website.',
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
  installTitle: 'Ajoutez AI Wallet à votre navigateur',
  installText: 'L\'extension AI Wallet garde vos comptes d\'IA et les connecte aux sites que vous approuvez. '
    + 'Rechargez cette page une fois l\'extension installée.',
  addToBrowser: (browser) => `Ajouter à ${browser}`,
  installButton: 'Installer AI Wallet',
  safariAlreadyAdded: 'Déjà ajouté ? Cliquez sur AI Wallet dans la barre d\'outils de Safari, puis sur Autoriser '
    + 'sur tous les sites web.',
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
  installTitle: 'הוסיפו את AI Wallet לדפדפן',
  installText: 'התוסף AI Wallet שומר את חשבונות הבינה המלאכותית שלכם ומחבר אותם לאתרים שאתם מאשרים. '
    + 'טענו מחדש את הדף אחרי ההתקנה.',
  addToBrowser: (browser) => `הוספה לדפדפן ${browser}`,
  installButton: 'התקנת AI Wallet',
  safariAlreadyAdded: 'כבר הוספתם? לחצו על AI Wallet בסרגל הכלים של Safari ואז על „אישור בכל האתרים”.',
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
  installTitle: 'أضف AI Wallet إلى متصفحك',
  installText: 'تحتفظ إضافة AI Wallet بحسابات الذكاء الاصطناعي الخاصة بك وتربطها بالمواقع التي توافق عليها. '
    + 'أعد تحميل هذه الصفحة بعد تثبيتها.',
  addToBrowser: (browser) => `إضافة إلى ${browser}`,
  installButton: 'تثبيت AI Wallet',
  safariAlreadyAdded: 'هل أضفته من قبل؟ انقر على AI Wallet في شريط أدوات Safari، ثم على «السماح على كل مواقع الويب».',
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
  installTitle: '将 AI Wallet 添加到你的浏览器',
  installText: 'AI Wallet 扩展保管你的 AI 账户，并把它们连接到你批准的网站。安装完成后请重新加载此页面。',
  addToBrowser: (browser) => `添加至 ${browser}`,
  installButton: '安装 AI Wallet',
  safariAlreadyAdded: '已经添加过？点按 Safari 工具栏中的 AI Wallet，然后点按“在所有网站上允许”。',
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
