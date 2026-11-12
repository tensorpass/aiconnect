// The copy of the interface modules in each built in language. A site passes `locale`, or its own
// `moduleMessages`, to match its voice. The modules also read the connect window's copy for the
// connection steps they show.

import { builtInLauncherMessages } from './launcher.ts';
import type { LauncherMessages } from './launcher.ts';
import type { Locale } from './pickerMessages.ts';

// The modules' copy. The direction, the headings and the labels of the buttons that open a chat come from
// the launcher module, which the Web Components' loader reads too.
export interface ModuleMessages extends LauncherMessages {
  intro: string;
  placeholder: string;
  searchPlaceholder: string;
  searchLabel: string;
  suggestionsLabel: string;
  send: string;
  stop: string;
  stopped: string;
  newChat: string;
  close: string;
  clear: string;
  question: string;
  answersWith: string;
  thinking: string;
  toolRunning: string;
  toolDone: string;
  toolFailed: string;
  connect: string;
  installText: string;
  pendingText: string;
  retry: string;
  // Shown in place of a question or an answer the chat's guards stopped, unless the site sets its own.
  guardQuestion: string;
  guardAnswer: string;
  // Shown when the account that answers is refused by its provider: its usage limit reached (HTTP 429) or
  // the provider out of service (5xx). `{account}` stands for the account's name, such as ChatGPT.
  limitReached: string;
  providerDown: string;
}

const enModules: ModuleMessages = {
  ...builtInLauncherMessages.en,
  intro: 'What would you like to know?',
  placeholder: 'Ask a question',
  searchPlaceholder: 'Search or ask a question',
  searchLabel: 'Ask this site',
  suggestionsLabel: 'Suggested questions',
  send: 'Send',
  stop: 'Stop',
  stopped: 'Answer stopped',
  newChat: 'New chat',
  close: 'Close',
  clear: 'Clear',
  question: 'Your question',
  answersWith: 'Answers with',
  thinking: 'Thinking',
  toolRunning: 'running',
  toolDone: 'done',
  toolFailed: 'Failed',
  connect: 'Connect your AI',
  installText: 'Add the AI Wallet extension and this site answers with the AI plan you already pay for.',
  pendingText: 'Your question is ready. Connect your AI to see the answer.',
  retry: 'Try again',
  guardQuestion: 'This chat answers questions about the site. Ask about what you are looking for here.',
  guardAnswer: 'This answer was held back because it broke the site\'s rules. Try asking another way.',
  limitReached: '{account} has reached its usage limit for now. Try again later, or choose another account in '
    + 'AI Wallet.',
  providerDown: '{account} is not answering right now. Try again in a moment.',
};

const frModules: ModuleMessages = {
  ...builtInLauncherMessages.fr,
  intro: 'Que voulez-vous savoir\u00a0?',
  placeholder: 'Posez votre question',
  searchPlaceholder: 'Cherchez ou posez une question',
  searchLabel: 'Interrogez ce site',
  suggestionsLabel: 'Questions suggérées',
  send: 'Envoyer',
  stop: 'Arrêter',
  stopped: 'Réponse arrêtée',
  newChat: 'Nouvelle conversation',
  close: 'Fermer',
  clear: 'Effacer',
  question: 'Votre question',
  answersWith: 'Répond avec',
  thinking: 'Réflexion en cours',
  toolRunning: 'en cours',
  toolDone: 'terminé',
  toolFailed: 'Échec',
  connect: 'Connecter votre IA',
  installText: 'Ajoutez l\'extension AI Wallet et ce site répond avec l\'abonnement d\'IA que vous payez déjà.',
  pendingText: 'Votre question est prête. Connectez votre IA pour voir la réponse.',
  retry: 'Réessayer',
  guardQuestion: 'Cette conversation répond aux questions sur le site. Demandez ce que vous cherchez ici.',
  guardAnswer: 'Cette réponse a été retenue, car elle enfreignait les règles du site. Reformulez votre question.',
  limitReached: '{account} a atteint sa limite d\'utilisation pour le moment. Réessayez plus tard, ou choisissez '
    + 'un autre compte dans AI Wallet.',
  providerDown: '{account} ne répond pas pour le moment. Réessayez dans un instant.',
};

const heModules: ModuleMessages = {
  ...builtInLauncherMessages.he,
  intro: 'מה תרצו לדעת?',
  placeholder: 'כתבו שאלה',
  searchPlaceholder: 'חפשו או שאלו שאלה',
  searchLabel: 'שאלו את האתר',
  suggestionsLabel: 'שאלות מוצעות',
  send: 'שליחה',
  stop: 'עצירה',
  stopped: 'התשובה נעצרה',
  newChat: 'שיחה חדשה',
  close: 'סגירה',
  clear: 'ניקוי',
  question: 'השאלה שלכם',
  answersWith: 'עונה עם',
  thinking: 'חושב',
  toolRunning: 'פועל',
  toolDone: 'הסתיים',
  toolFailed: 'נכשל',
  connect: 'חיבור הבינה המלאכותית',
  installText: 'הוסיפו את התוסף AI Wallet והאתר יענה עם המנוי שאתם כבר משלמים עליו.',
  pendingText: 'השאלה שלכם מוכנה. חברו את הבינה המלאכותית שלכם כדי לראות את התשובה.',
  retry: 'ניסיון נוסף',
  guardQuestion: 'הצ׳אט הזה עונה על שאלות על האתר. שאלו על מה שאתם מחפשים כאן.',
  guardAnswer: 'התשובה הזו נעצרה כי היא חרגה מהכללים של האתר. נסו לשאול אחרת.',
  limitReached: '{account} הגיע למגבלת השימוש שלו כרגע. נסו שוב מאוחר יותר, או בחרו חשבון אחר '
    + 'בתוך AI Wallet.',
  providerDown: '{account} לא עונה כרגע. נסו שוב בעוד רגע.',
};

const arModules: ModuleMessages = {
  ...builtInLauncherMessages.ar,
  intro: 'ماذا تريد أن تعرف؟',
  placeholder: 'اطرح سؤالًا',
  searchPlaceholder: 'ابحث أو اطرح سؤالًا',
  searchLabel: 'اسأل هذا الموقع',
  suggestionsLabel: 'أسئلة مقترحة',
  send: 'إرسال',
  stop: 'إيقاف',
  stopped: 'توقفت الإجابة',
  newChat: 'محادثة جديدة',
  close: 'إغلاق',
  clear: 'مسح',
  question: 'سؤالك',
  answersWith: 'يجيب عبر',
  thinking: 'يفكر',
  toolRunning: 'قيد التشغيل',
  toolDone: 'تم',
  toolFailed: 'فشل',
  connect: 'اربط الذكاء الاصطناعي الخاص بك',
  installText: 'أضف إضافة AI Wallet وسيجيب هذا الموقع باشتراك الذكاء الاصطناعي الذي تدفع ثمنه بالفعل.',
  pendingText: 'سؤالك جاهز. اربط الذكاء الاصطناعي الخاص بك لرؤية الإجابة.',
  retry: 'إعادة المحاولة',
  guardQuestion: 'تجيب هذه المحادثة عن أسئلة حول الموقع. اسأل عمّا تبحث عنه هنا.',
  guardAnswer: 'حُجبت هذه الإجابة لأنها خالفت قواعد الموقع. جرّب صياغة سؤالك بطريقة أخرى.',
  limitReached: '{account} بلغ حد الاستخدام في الوقت الحالي. حاول مرة أخرى لاحقًا، أو اختر حسابًا آخر في '
    + 'AI Wallet.',
  providerDown: '{account} لا يجيب الآن. حاول مرة أخرى بعد قليل.',
};

const zhModules: ModuleMessages = {
  ...builtInLauncherMessages.zh,
  intro: '你想了解什么？',
  placeholder: '提个问题',
  searchPlaceholder: '搜索或提问',
  searchLabel: '向这个网站提问',
  suggestionsLabel: '推荐问题',
  send: '发送',
  stop: '停止',
  stopped: '回答已停止',
  newChat: '新对话',
  close: '关闭',
  clear: '清除',
  question: '你的问题',
  answersWith: '回答使用',
  thinking: '思考中',
  toolRunning: '运行中',
  toolDone: '完成',
  toolFailed: '失败',
  connect: '连接你的 AI',
  installText: '添加 AI Wallet 扩展后，这个网站就会用你已经付费的 AI 订阅来回答。',
  pendingText: '你的问题已准备好。连接你的 AI 即可查看回答。',
  retry: '重试',
  guardQuestion: '这个对话回答有关本网站的问题。请询问你在这里要找的内容。',
  guardAnswer: '这个回答因违反网站规则而被拦下。请换一种方式提问。',
  limitReached: '{account} 暂时已达到使用上限。请稍后再试，或在 AI Wallet 中选择其他账户。',
  providerDown: '{account} 现在没有响应。请稍后再试。',
};

export const builtInModuleMessages: Record<Locale, ModuleMessages> = {
  en: enModules, fr: frModules, he: heModules, ar: arModules, zh: zhModules,
};
