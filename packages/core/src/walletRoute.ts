// Where a visitor without AI Wallet goes to get it. On a computer, and on Android for now, the visitor adds
// the wallet to the browser (`walletInstallUrl`). On an iPhone the wallet comes with the AI Wallet app:
// Safari answers through the app's Safari extension, and every other iPhone browser hands the page over,
// either to Safari through Apple's `x-safari-https://` scheme (iOS 17 and later) or to the app's own browser
// through a universal link on tensorpass.app that carries the page's address.

import { browserOf, visitorBrowser, walletInstallUrl } from './visitorBrowser.ts';
import type { BrowserSignals, VisitorBrowser } from './visitorBrowser.ts';

export type WalletRoute =
  // A computer or Android: the wallet's page for this browser.
  | { kind: 'install'; browser: VisitorBrowser; url: string }
  // Safari on an iPhone: the AI Wallet app, whose Safari extension answers the page.
  | { kind: 'iphoneSafari'; appUrl: string }
  // Any other iPhone browser: the page again in Safari, where iOS has the scheme, or in the app's browser.
  | { kind: 'iphoneBrowser'; safariUrl: string | null; appUrl: string };

const APP_LINK = 'https://tensorpass.app/open';
// The first iOS whose Safari opens `x-safari-https://` addresses.
const SAFARI_SCHEME_SINCE = 17;
const IOS_DEVICE = /\b(iPhone|iPad|iPod)\b/;
const IOS_VERSION = /\bOS (\d+)_\d+/;
// The tokens other iPhone browsers and in app browsers add to Safari's own user agent.
const OTHER_IOS_BROWSER = /\b(CriOS|FxiOS|EdgiOS|OPiOS|OPT|GSA|DuckDuckGo|Ddg|YaBrowser|Brave|Focus)\//;

interface IosBrowser {
  safari: boolean;
  version: number;
}

/** The iPhone or iPad browser the user agent names, or null for any other device. */
export function iosBrowserOf(userAgent: string): IosBrowser | null {
  if (!IOS_DEVICE.test(userAgent)) {
    return null;
  }
  const version = Number(IOS_VERSION.exec(userAgent)?.[1] ?? 0);
  const safari = /\bVersion\/[\d.]+.*\bSafari\//.test(userAgent) && !OTHER_IOS_BROWSER.test(userAgent);
  return { safari, version };
}

/** The address that opens the page in the AI Wallet app, or on tensorpass.app when the app is missing. */
export function walletAppLink(pageUrl: string): string {
  return `${APP_LINK}?url=${encodeURIComponent(pageUrl)}`;
}

/** The address that opens the page in Safari from another iPhone browser, or null for a page that is not web. */
export function safariLink(pageUrl: string): string | null {
  return /^https?:\/\//.test(pageUrl) ? `x-safari-${pageUrl}` : null;
}

/** Where a visitor with these signals, on the page at `pageUrl`, gets AI Wallet. */
export function walletRouteOf(signals: BrowserSignals, pageUrl: string): WalletRoute {
  const ios = iosBrowserOf(signals.userAgent);
  if (!ios) {
    const browser = browserOf(signals);
    return { kind: 'install', browser, url: walletInstallUrl(browser) };
  }
  if (ios.safari) {
    return { kind: 'iphoneSafari', appUrl: walletInstallUrl('safari') };
  }
  const safariUrl = ios.version >= SAFARI_SCHEME_SINCE ? safariLink(pageUrl) : null;
  return { kind: 'iphoneBrowser', safariUrl, appUrl: walletAppLink(pageUrl) };
}

/** Where the visitor of this page gets AI Wallet; a server, with no visitor, gets the general wallet page. */
export function visitorWalletRoute(): WalletRoute {
  const userAgent = (globalThis as { navigator?: { userAgent?: string } }).navigator?.userAgent ?? '';
  const pageUrl = (globalThis as { location?: { href?: string } }).location?.href ?? '';
  if (!iosBrowserOf(userAgent)) {
    const browser = visitorBrowser();
    return { kind: 'install', browser, url: walletInstallUrl(browser) };
  }
  return walletRouteOf({ userAgent, brands: [], brave: false, mobile: true }, pageUrl);
}
