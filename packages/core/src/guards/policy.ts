// What a site tunes in the guards of its chat. Every field is optional: the guards run with their own
// defaults on every conversation, and a site adds its own names, hosts and limits here.

export interface GuardPolicy {
  // The longest question a visitor may send, in characters.
  maxInputLength?: number;
  // What the chat answers about, such as "the restaurants of this site". The model redirects any other
  // question.
  scope?: string;
  // Hosts an answer may link to, with their subdomains, besides the page's own origin and the addresses
  // the site's tools returned.
  allowedLinkHosts?: string[];
  // Email addresses an answer may give, besides the ones the visitor typed and the site's tools returned.
  allowedEmails?: string[];
  // Internal names an answer stops on: tool and table names, vendors, servers, identifier shapes.
  // A string is read as a regular expression, without regard to case. The answer is read in the
  // visitor's browser as it streams, so the pieces before a match were already shown: a name that
  // must stay on the site's server is held back there, by `checkToolResult`.
  denyPatterns?: (string | RegExp)[];
  // Content the site does not hand out, such as a template with placeholders to fill in. Read as
  // `denyPatterns` is.
  withholdPatterns?: (string | RegExp)[];
  // The tools whose activity the interface shows. Every tool shows when it is left out.
  visibleTools?: string[];
  // Shown in place of a question or an answer a guard stopped. The modules show their own words in the
  // page's language when it is left out.
  safeAnswer?: string;
}

export const DEFAULT_MAX_INPUT_LENGTH = 2000;

// Why a guard stopped a question.
export type QuestionStop = 'empty' | 'too-long' | 'injection';

// Why a guard stopped an answer: an envelope tag or the salt of the conversation, an image, a link or
// an email address from outside the conversation, an internal name, or withheld content.
export type AnswerStop = 'envelope-tag' | 'salt' | 'image' | 'link' | 'email' | 'denied' | 'withheld';

export type QuestionVerdict = { ok: true } | { ok: false; reason: QuestionStop; pattern?: string };

export type AnswerVerdict = { ok: true } | { ok: false; reason: AnswerStop; detail?: string };

// The patterns of a policy as regular expressions. A string that is not a valid regular expression
// throws, naming it, since a pattern the guard cannot read would let its names through.
export function compilePatterns(patterns: (string | RegExp)[] = []): RegExp[] {
  return patterns.map((pattern) => {
    // A global or sticky expression keeps its position between tests, so it is read without those flags.
    if (pattern instanceof RegExp) {
      return new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
    }
    try {
      return new RegExp(pattern, 'i');
    } catch {
      throw new Error(`The guard pattern ${pattern} is not a valid regular expression.`);
    }
  });
}
