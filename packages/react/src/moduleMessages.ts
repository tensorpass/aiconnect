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
  pendingText: string;
  retry: string;
  // Shown in place of a question or an answer the chat's guards stopped, unless the site sets its own.
  guardQuestion: string;
  guardAnswer: string;
  // Shown when the account that answers is refused by its provider: its usage limit reached (HTTP 429) or
  // the provider out of service (5xx). `{account}` stands for the account's name, such as ChatGPT.
  limitReached: string;
  providerDown: string;
  // The attachments: the attach button, the drop zone, the refusals and the chip of each file. `{size}`,
  // `{count}`, `{name}` and `{account}` stand for the size cap, a count, a file's name and the account.
  attach: string;
  attachDrop: string;
  attachRefusedType: string;
  attachRefusedSize: string;
  attachRefusedCount: string;
  attachUnreadable: string;
  attachmentRemove: string;
  attachmentReading: string;
  imageUnread: string;
  unreadPages: string;
  // Dictation: the microphone button, the recording, the transcription, and what went wrong.
  dictate: string;
  dictating: string;
  transcribing: string;
  dictationCancel: string;
  dictationStop: string;
  micDenied: string;
  dictationFailed: string;
  dictationLimit: string;
  // The images of a question, opened in the lightbox.
  openImage: string;
  imageOf: string;
  previousImage: string;
  nextImage: string;
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
  pendingText: 'Your question is ready. Connect your AI to see the answer.',
  retry: 'Try again',
  guardQuestion: 'This chat answers questions about the site. Ask about what you are looking for here.',
  guardAnswer: 'This answer was held back because it broke the site\'s rules. Try asking another way.',
  limitReached: '{account} has reached its usage limit for now. Try again later, or choose another account in '
    + 'AI Wallet.',
  providerDown: '{account} is not answering right now. Try again in a moment.',
  attach: 'Attach files',
  attachDrop: 'Drop to attach',
  attachRefusedType: 'This type of file cannot be attached.',
  attachRefusedSize: 'Too large to attach. The files of one question stay under {size}.',
  attachRefusedCount: 'One question takes {count} files at most.',
  attachUnreadable: 'Your browser could not read {name}.',
  attachmentRemove: 'Remove {name}',
  attachmentReading: 'Reading',
  imageUnread: 'Not read by {account}',
  unreadPages: 'Images or pages not sent to {account}, which does not read them: {count}.',
  dictate: 'Dictate',
  dictating: 'Listening',
  transcribing: 'Writing your words',
  dictationCancel: 'Cancel',
  dictationStop: 'Done',
  micDenied: 'Allow the microphone for this site in your browser\'s address bar, then try again.',
  dictationFailed: 'The dictation did not go through. Type your question or try again.',
  dictationLimit: 'This site used its minutes of dictation for today. Type your question.',
  openImage: 'Open the image',
  imageOf: 'Image {index} of {count}',
  previousImage: 'Previous image',
  nextImage: 'Next image',
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
  pendingText: 'Votre question est prête. Connectez votre IA pour voir la réponse.',
  retry: 'Réessayer',
  guardQuestion: 'Cette conversation répond aux questions sur le site. Demandez ce que vous cherchez ici.',
  guardAnswer: 'Cette réponse a été retenue, car elle enfreignait les règles du site. Reformulez votre question.',
  limitReached: '{account} a atteint sa limite d\'utilisation pour le moment. Réessayez plus tard, ou choisissez '
    + 'un autre compte dans AI Wallet.',
  providerDown: '{account} ne répond pas pour le moment. Réessayez dans un instant.',
  attach: 'Joindre des fichiers',
  attachDrop: 'Déposez pour joindre',
  attachRefusedType: 'Ce type de fichier ne peut pas être joint.',
  attachRefusedSize: 'Fichier trop lourd. Les fichiers d\'une question restent sous {size}.',
  attachRefusedCount: 'Une question prend {count} fichiers au plus.',
  attachUnreadable: 'Votre navigateur n\'a pas pu lire {name}.',
  attachmentRemove: 'Retirer {name}',
  attachmentReading: 'Lecture',
  imageUnread: 'Non lu par {account}',
  unreadPages: 'Images ou pages non envoyées à {account}, qui ne les lit pas\u00a0: {count}.',
  dictate: 'Dicter',
  dictating: 'Écoute',
  transcribing: 'Transcription',
  dictationCancel: 'Annuler',
  dictationStop: 'Terminer',
  micDenied: 'Autorisez le micro pour ce site dans la barre d\'adresse du navigateur, puis réessayez.',
  dictationFailed: 'La dictée n\'a pas abouti. Tapez votre question ou réessayez.',
  dictationLimit: 'Ce site a utilisé ses minutes de dictée du jour. Tapez votre question.',
  openImage: 'Ouvrir l\'image',
  imageOf: 'Image {index} sur {count}',
  previousImage: 'Image précédente',
  nextImage: 'Image suivante',
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
  pendingText: 'השאלה שלכם מוכנה. חברו את הבינה המלאכותית שלכם כדי לראות את התשובה.',
  retry: 'ניסיון נוסף',
  guardQuestion: 'הצ׳אט הזה עונה על שאלות על האתר. שאלו על מה שאתם מחפשים כאן.',
  guardAnswer: 'התשובה הזו נעצרה כי היא חרגה מהכללים של האתר. נסו לשאול אחרת.',
  limitReached: '{account} הגיע למגבלת השימוש שלו כרגע. נסו שוב מאוחר יותר, או בחרו חשבון אחר '
    + 'בתוך AI Wallet.',
  providerDown: '{account} לא עונה כרגע. נסו שוב בעוד רגע.',
  attach: 'צירוף קבצים',
  attachDrop: 'שחררו כדי לצרף',
  attachRefusedType: 'לא ניתן לצרף קובץ מסוג זה.',
  attachRefusedSize: 'הקובץ גדול מדי. אפשר לצרף עד {size} לכל שאלה.',
  attachRefusedCount: 'אפשר לצרף עד {count} קבצים לכל שאלה.',
  attachUnreadable: 'הדפדפן לא הצליח לקרוא את {name}.',
  attachmentRemove: 'הסרת {name}',
  attachmentReading: 'קורא',
  imageUnread: '{account} לא קורא תמונות',
  unreadPages: 'תמונות או עמודים שלא נשלחו אל {account}, שלא קורא אותם: {count}.',
  dictate: 'הכתבה',
  dictating: 'מקשיב',
  transcribing: 'מתמלל',
  dictationCancel: 'ביטול',
  dictationStop: 'סיום',
  micDenied: 'אפשרו את המיקרופון לאתר הזה בשורת הכתובת של הדפדפן, ונסו שוב.',
  dictationFailed: 'ההכתבה לא הצליחה. הקלידו את השאלה או נסו שוב.',
  dictationLimit: 'האתר הזה ניצל את דקות ההכתבה של היום. הקלידו את השאלה.',
  openImage: 'פתיחת התמונה',
  imageOf: 'תמונה {index} מתוך {count}',
  previousImage: 'התמונה הקודמת',
  nextImage: 'התמונה הבאה',
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
  pendingText: 'سؤالك جاهز. اربط الذكاء الاصطناعي الخاص بك لرؤية الإجابة.',
  retry: 'إعادة المحاولة',
  guardQuestion: 'تجيب هذه المحادثة عن أسئلة حول الموقع. اسأل عمّا تبحث عنه هنا.',
  guardAnswer: 'حُجبت هذه الإجابة لأنها خالفت قواعد الموقع. جرّب صياغة سؤالك بطريقة أخرى.',
  limitReached: '{account} بلغ حد الاستخدام في الوقت الحالي. حاول مرة أخرى لاحقًا، أو اختر حسابًا آخر في '
    + 'AI Wallet.',
  providerDown: '{account} لا يجيب الآن. حاول مرة أخرى بعد قليل.',
  attach: 'إرفاق ملفات',
  attachDrop: 'أفلت الملف لإرفاقه',
  attachRefusedType: 'لا يمكن إرفاق هذا النوع من الملفات.',
  attachRefusedSize: 'الملف كبير جدًا. يمكنك إرفاق {size} كحد أقصى لكل سؤال.',
  attachRefusedCount: 'يمكنك إرفاق {count} ملفات كحد أقصى لكل سؤال.',
  attachUnreadable: 'تعذّر على متصفحك قراءة {name}.',
  attachmentRemove: 'إزالة {name}',
  attachmentReading: 'جارٍ القراءة',
  imageUnread: '{account} لا يقرأ الصور',
  unreadPages: 'صور أو صفحات لم تُرسل إلى {account} لأنه لا يقرؤها: {count}.',
  dictate: 'إملاء',
  dictating: 'جارٍ الاستماع',
  transcribing: 'جارٍ النسخ',
  dictationCancel: 'إلغاء',
  dictationStop: 'إنهاء',
  micDenied: 'اسمح باستخدام الميكروفون لهذا الموقع من شريط العنوان في متصفحك، ثم حاول مرة أخرى.',
  dictationFailed: 'لم ينجح الإملاء. اكتب سؤالك أو حاول مرة أخرى.',
  dictationLimit: 'استخدم هذا الموقع دقائق الإملاء المتاحة له اليوم. اكتب سؤالك.',
  openImage: 'فتح الصورة',
  imageOf: 'الصورة {index} من {count}',
  previousImage: 'الصورة السابقة',
  nextImage: 'الصورة التالية',
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
  pendingText: '你的问题已准备好。连接你的 AI 即可查看回答。',
  retry: '重试',
  guardQuestion: '这个对话回答有关本网站的问题。请询问你在这里要找的内容。',
  guardAnswer: '这个回答因违反网站规则而被拦下。请换一种方式提问。',
  limitReached: '{account} 暂时已达到使用上限。请稍后再试，或在 AI Wallet 中选择其他账户。',
  providerDown: '{account} 现在没有响应。请稍后再试。',
  attach: '添加文件',
  attachDrop: '松开即可添加',
  attachRefusedType: '无法添加此类型的文件。',
  attachRefusedSize: '文件太大。每个问题的文件总计不超过 {size}。',
  attachRefusedCount: '每个问题最多添加 {count} 个文件。',
  attachUnreadable: '浏览器无法读取 {name}。',
  attachmentRemove: '移除 {name}',
  attachmentReading: '读取中',
  imageUnread: '{account} 无法读取图片',
  unreadPages: '未发送给 {account} 的图片或页面（它无法读取）：{count}。',
  dictate: '语音输入',
  dictating: '正在聆听',
  transcribing: '正在转写',
  dictationCancel: '取消',
  dictationStop: '完成',
  micDenied: '请在浏览器地址栏中允许此网站使用麦克风，然后重试。',
  dictationFailed: '语音输入未成功。请输入问题或重试。',
  dictationLimit: '此网站今天的语音输入时长已用完。请输入问题。',
  openImage: '打开图片',
  imageOf: '第 {index} 张，共 {count} 张',
  previousImage: '上一张图片',
  nextImage: '下一张图片',
};

export const builtInModuleMessages: Record<Locale, ModuleMessages> = {
  en: enModules, fr: frModules, he: heModules, ar: arModules, zh: zhModules,
};
