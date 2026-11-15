// The copy of the connect window and of the interface modules, with what reads it: the step after a
// connection that did not go through and the words of an answer that failed. The copy of each
// language lives in pickerMessages.ts and moduleMessages.ts.

import { BROWSER_NAMES } from '@tensorpass/aiconnect';
import type { VisitorBrowser, WalletRefusal } from '@tensorpass/aiconnect';
import type { ModuleMessages } from './moduleMessages.ts';
import type { PickerMessages, RefusalStep } from './pickerMessages.ts';

export { builtInModuleMessages } from './moduleMessages.ts';
export type { ModuleMessages } from './moduleMessages.ts';
export { builtInMessages } from './pickerMessages.ts';
export type { Locale, PickerMessages, RefusalStep } from './pickerMessages.ts';

// The words of the install button: "Add to" the visitor's browser, or the general words for a browser the
// wallet does not name.
export function installLabel(messages: PickerMessages, browser: VisitorBrowser): string {
  return browser === 'other' ? messages.installButton : messages.addToBrowser(BROWSER_NAMES[browser]);
}

// The line under the install button for a visitor who may have the wallet already: in Safari, which runs
// an extension only on the sites the visitor allowed, the way to allow it on every website. Any other
// browser runs the wallet everywhere once it is added, and has no such line.
export function alreadyAddedLine(messages: PickerMessages, browser: VisitorBrowser): string | undefined {
  return browser === 'safari' ? messages.safariAlreadyAdded : undefined;
}

// The step a connection in error shows: the words for the reason the wallet gave, or the wallet's
// own message under the general title.
export function refusalStep(state: { message: string; reason?: WalletRefusal }, messages: PickerMessages): RefusalStep {
  return state.reason ? messages.refusals[state.reason] : { ...messages.refusals.failed, text: state.message };
}

// The words of an answer that failed, in the page's language: the account's usage limit for a 429 and the
// provider out of service for a 5xx, which only the provider sends. Any other failure keeps the wallet's own
// message, since the wallet answers 401, 403 and 499 itself. The error comes from the wallet's own copy of
// `WalletRequestError`, so its status is read as a field.
export function failedAnswerText(reason: unknown, account: string, messages: ModuleMessages): string {
  const status = (reason as { status?: unknown } | null)?.status;
  if (status === 429) {
    return messages.limitReached.replaceAll('{account}', account);
  }
  if (typeof status === 'number' && status >= 500) {
    return messages.providerDown.replaceAll('{account}', account);
  }
  return reason instanceof Error ? reason.message : String(reason);
}
