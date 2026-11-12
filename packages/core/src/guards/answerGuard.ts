// The guard on the model's answer, run as it streams and once it ends, before the visitor sees it. An
// answer stops on an envelope tag or the salt, which mean the model is repeating its instructions; on
// an image, which loads by itself and can carry the conversation to another server; on a link or an
// email address that comes from neither the site, its tools, nor the visitor; and on the site's own
// internal names and withheld content. A web address or an email address counts as the tools' own when
// a result gives it as a whole field, such as a restaurant's `website` or a shop's `email`: the result
// is read as JSON, and a string of it that is one address and nothing else is such a field. An address
// written inside free text, such as a review a third party planted, is none, whatever quotes surround
// it, and a result that is not JSON gives no address at all. While the answer streams, a link or an
// address still being written is left for the next check, so a host is judged once it is complete.
// Every address is read with the URL parser, which resolves it as the browser does on a click.

import { compilePatterns } from './policy.ts';
import type { AnswerVerdict, GuardPolicy } from './policy.ts';

export interface AnswerContext {
  salt?: string;
  policy?: GuardPolicy;
  // Everything the visitor typed in the conversation.
  visitorText?: string;
  // Each result the site's tools returned in the conversation, as the tool gave it. A conversation
  // adds its results to the same list, which the guard reads once each.
  toolResults?: readonly string[];
  // The page's own origin, whose pages an answer may always link to.
  origin?: string;
  // The answer is still streaming.
  partial?: boolean;
}

interface Found {
  value: string;
  end: number;
}

const ENVELOPE_TAG = /<\/?\s*(?:instructions?|tool-result|steering)-/i;
const IMAGE = /!\[[^\]\n]*\]\(|<img\b/i;
const EMAIL = /[^\s@<>()[\]"'`:]+@[^\s@<>()[\]"'`]+\.[a-z]{2,}/gi;
const LINK_TARGET = /\]\(\s*<?([^)\s>]+)|\b(https?:\/\/[^\s)\]>"'`]+)|<a\b[^>]*\bhref\s*=\s*["']?([^"'\s>]+)|\b(www\.[^\s)\]>"'`]+)/gi;
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;
// Stands for the page's origin where the guard runs without a page, such as a site's server.
const NO_PAGE_ORIGIN = 'https://page.invalid';

const compiled = new WeakMap<GuardPolicy, { deny: RegExp[]; withhold: RegExp[] }>();

function patternsOf(policy: GuardPolicy) {
  let patterns = compiled.get(policy);
  if (!patterns) {
    patterns = { deny: compilePatterns(policy.denyPatterns), withhold: compilePatterns(policy.withholdPatterns) };
    compiled.set(policy, patterns);
  }
  return patterns;
}

// The values found, without the ones running to the end of a streaming answer, which are still being
// written.
function finished(found: Found[], text: string, partial = false): string[] {
  return found.filter((item) => !partial || item.end < text.length).map((item) => item.value);
}

function linkTargets(text: string): Found[] {
  return [...text.matchAll(LINK_TARGET)].map((match) => {
    const [, markdown, bare, anchor, www] = match;
    const value = markdown ?? anchor ?? `${www ? 'https://' : ''}${(bare ?? www).replace(TRAILING_PUNCTUATION, '')}`;
    return { value, end: match.index + match[0].length };
  });
}

function emails(text: string): Found[] {
  return [...text.matchAll(EMAIL)].map((match) => ({
    value: match[0].toLowerCase(),
    end: match.index + match[0].length,
  }));
}

const withoutFinalSlash = (href: string) => href.replace(/\/+$/, '');

const WHOLE_ADDRESS = /^https?:\/\/\S+$/;
const WHOLE_EMAIL = /^[^\s@<>()[\]"'`:]+@[^\s@<>()[\]"'`]+\.[a-z]{2,}$/i;

// The strings of a parsed result, at any depth.
function stringsIn(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  return typeof value === 'object' && value !== null ? Object.values(value).flatMap(stringsIn) : [];
}

// The strings one tool result gives as fields. Only an object or a list has fields: a result that is
// free text, a tool error or a lone string gives none.
function fieldsOf(result: string): string[] {
  try {
    const parsed: unknown = JSON.parse(result);
    return typeof parsed === 'object' ? stringsIn(parsed) : [];
  } catch {
    return [];
  }
}

interface ToolFields {
  // How many results of the list were read.
  results: number;
  // The fields that are one web address and nothing else.
  addresses: Set<string>;
  // The fields that are one email address and nothing else, in lower case.
  emails: Set<string>;
}

// What was read so far from each list of results.
const fieldsRead = new WeakMap<readonly string[], ToolFields>();

// The web and email addresses the site's tools returned as whole fields of their results.
function toolFields(results: readonly string[] = []): ToolFields {
  const read = fieldsRead.get(results) ?? { results: 0, addresses: new Set<string>(), emails: new Set<string>() };
  fieldsRead.set(results, read);
  for (; read.results < results.length; read.results += 1) {
    for (const field of fieldsOf(results[read.results])) {
      if (WHOLE_ADDRESS.test(field)) {
        read.addresses.add(withoutFinalSlash(field));
      } else if (WHOLE_EMAIL.test(field)) {
        read.emails.add(field.toLowerCase());
      }
    }
  }
  return read;
}

// Whether an answer may give `email`: the visitor typed it, the policy lists it, or a tool returned it
// as a whole field.
export function emailAllowed(email: string, context: AnswerContext): boolean {
  const address = email.toLowerCase();
  const typed = (context.visitorText ?? '').toLowerCase().replace(/\s+/g, '');
  const published = (context.policy?.allowedEmails ?? []).map((item) => item.toLowerCase());
  return published.includes(address) || typed.includes(address) || toolFields(context.toolResults).emails.has(address);
}

// Whether `hostname` is the page's own host or one the policy allows. A page whose origin is opaque,
// such as the `null` of a sandboxed frame, has no host of its own.
function hostAllowed(hostname: string, context: AnswerContext): boolean {
  const own = context.origin ? parsedUrl(context.origin)?.hostname : undefined;
  return hostname === own || (context.policy?.allowedLinkHosts ?? [])
    .some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

function parsedUrl(address: string, base?: string): URL | null {
  try {
    return new URL(address, base);
  } catch {
    return null;
  }
}

// The fields of a mailto: link that add addresses to send to (RFC 6068).
const RECIPIENT_FIELDS = new Set(['to', 'cc', 'bcc']);

// The addresses a mailto: link sends to, decoded as a mail client reads them: the one before the `?`
// and those of its to, cc and bcc fields. Written with escapes, as in `cc=a%40b%2Eexample`, they pass
// the email scan of the answer unseen. An escape that does not decode, such as `%E0%A4%A`, gives no
// address, and the link is refused.
function mailtoRecipients(href: string): string[] | null {
  const target = href.slice('mailto:'.length);
  const question = target.indexOf('?');
  const fields = question === -1 ? [] : target.slice(question + 1).split('&').map((field) => field.split('='));
  try {
    const added = fields.filter(([name]) => RECIPIENT_FIELDS.has(decodeURIComponent(name).toLowerCase()))
      .map(([, ...value]) => decodeURIComponent(value.join('=')));
    const path = decodeURIComponent(question === -1 ? target : target.slice(0, question));
    return [path, ...added].filter((address) => address !== '');
  } catch {
    return null;
  }
}

// Whether `href` is an address written without its site that leads to a page of `origin`, the page's
// own when none is given. `/returns`, `#top` and `../a` do. `//host`, `/\host` and an address with its
// own scheme lead elsewhere, whatever tabs, line breaks or encoding they are written with.
export function leadsToSitePage(href: string, origin = NO_PAGE_ORIGIN): boolean {
  const site = parsedUrl(origin);
  const target = parsedUrl(href, origin);
  return site !== null && target !== null && parsedUrl(href) === null && target.origin === site.origin;
}

// Whether an answer may link to `href`: a path of the site, a page of its origin or of an allowed host,
// an address a tool returned as a field, as it is, or a mailto: link whose every address the
// conversation allows.
export function linkAllowed(href: string, context: AnswerContext): boolean {
  if (leadsToSitePage(href, context.origin)) {
    return true;
  }
  if (/^mailto:/i.test(href)) {
    const recipients = mailtoRecipients(href);
    return recipients !== null && recipients.every((address) => emailAllowed(address, context));
  }
  const url = parsedUrl(href);
  if (url?.protocol !== 'https:' && url?.protocol !== 'http:') {
    return false;
  }
  return hostAllowed(url.hostname, context) || toolFields(context.toolResults).addresses.has(withoutFinalSlash(href));
}

function patternStop(text: string, policy: GuardPolicy): AnswerVerdict {
  const { deny, withhold } = patternsOf(policy);
  const denied = deny.find((re) => re.test(text));
  if (denied) {
    return { ok: false, reason: 'denied', detail: denied.source };
  }
  return withhold.some((re) => re.test(text)) ? { ok: false, reason: 'withheld' } : { ok: true };
}

export function validateAnswer(text: string, context: AnswerContext = {}): AnswerVerdict {
  const { salt, partial } = context;
  if (ENVELOPE_TAG.test(text)) {
    return { ok: false, reason: 'envelope-tag' };
  }
  if (salt && text.includes(salt)) {
    return { ok: false, reason: 'salt' };
  }
  if (IMAGE.test(text)) {
    return { ok: false, reason: 'image' };
  }
  const link = finished(linkTargets(text), text, partial).find((href) => !linkAllowed(href, context));
  if (link) {
    return { ok: false, reason: 'link', detail: link };
  }
  const email = finished(emails(text), text, partial).find((address) => !emailAllowed(address, context));
  if (email) {
    return { ok: false, reason: 'email', detail: email };
  }
  return patternStop(text, context.policy ?? {});
}

// The guard a site's MCP server runs on each tool result before it leaves the server: the internal names
// and the withheld content of its policy. Anyone can call the server without the page, so these never
// leave it.
export function checkToolResult(text: string, policy: GuardPolicy): AnswerVerdict {
  return patternStop(text, policy);
}
