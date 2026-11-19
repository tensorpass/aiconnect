// The visitor's browser, which names the button that adds AI Wallet and picks where it installs from.
// This is the one place that knows where each browser gets the wallet: Chrome, Edge, Brave and Opera add it
// from its Chrome Web Store listing and Firefox from its Firefox Add-ons listing, public since 18 November
// 2026. Safari and the browsers of phones have no listing yet and go to the wallet's page.

export type VisitorBrowser = 'chrome' | 'edge' | 'brave' | 'opera' | 'firefox' | 'safari' | 'other';

// The browsers' own names, in Latin script in every language.
export const BROWSER_NAMES: Record<Exclude<VisitorBrowser, 'other'>, string> = {
  chrome: 'Chrome',
  edge: 'Edge',
  brave: 'Brave',
  opera: 'Opera',
  firefox: 'Firefox',
  safari: 'Safari',
};

// What a page can read of its browser: the user agent, the brands of `navigator.userAgentData` where the
// browser gives them, Brave's own `navigator.brave`, and whether the device is a phone or a tablet.
export interface BrowserSignals {
  userAgent: string;
  brands: string[];
  brave: boolean;
  mobile: boolean;
}

const WALLET_PAGE = 'https://tensorpass.app/wallet';

// A store that lists AI Wallet, by the name it gives itself.
export interface WalletStore {
  name: string;
  url: string;
}

export const WALLET_STORES = {
  chromeWebStore: {
    name: 'Chrome Web Store',
    url: 'https://chromewebstore.google.com/detail/ai-wallet/gkmgamdkmlidbjfmheeghkcjdofdafge',
  },
  firefoxAddOns: { name: 'Firefox Add-ons', url: 'https://addons.mozilla.org/en-US/firefox/addon/ai-wallet/' },
} as const satisfies Record<string, WalletStore>;

const STORE_OF: Partial<Record<VisitorBrowser, WalletStore>> = {
  chrome: WALLET_STORES.chromeWebStore,
  edge: WALLET_STORES.chromeWebStore,
  brave: WALLET_STORES.chromeWebStore,
  opera: WALLET_STORES.chromeWebStore,
  firefox: WALLET_STORES.firefoxAddOns,
};
const MOBILE = /Mobi|Android|iPhone|iPad|iPod/;
// Safari's user agent, on a Mac as on an iPhone or an iPad, and the other browsers that carry Safari's
// tokens: Chromium's, Android's own, and the other browsers of iOS, which run on Safari's engine and take
// no extension.
const SAFARI = /\bVersion\/[\d.]+.*\bSafari\//;
const NOT_SAFARI = /\b(Chrome|Chromium|CriOS|FxiOS|EdgiOS|OPiOS)\/|\bAndroid\b/;

// The brand that names each Chromium browser in `userAgentData`, then the token of its user agent.
const CHROMIUM: { browser: VisitorBrowser; brand: string; token: RegExp }[] = [
  { browser: 'edge', brand: 'Microsoft Edge', token: /\bEdg\// },
  { browser: 'opera', brand: 'Opera', token: /\bOPR\// },
  { browser: 'brave', brand: 'Brave', token: /\bBrave\// },
];

/**
 * The browser the signals describe. Safari is named on a Mac, an iPhone and an iPad, where the wallet runs
 * in it; any other browser of a phone or a tablet, or a browser the wallet does not name, is `other`.
 */
export function browserOf({ userAgent, brands, brave, mobile }: BrowserSignals): VisitorBrowser {
  if (!brave && SAFARI.test(userAgent) && !NOT_SAFARI.test(userAgent)) {
    return 'safari';
  }
  if (mobile || MOBILE.test(userAgent)) {
    return 'other';
  }
  if (brave) {
    return 'brave';
  }
  const chromium = CHROMIUM.find(({ brand, token }) => brands.includes(brand) || token.test(userAgent));
  if (chromium) {
    return chromium.browser;
  }
  // Chromium itself, and the browsers built on it that name no brand of their own, install from the
  // Chrome Web Store as Chrome does.
  if (brands.includes('Google Chrome') || brands.includes('Chromium') || /\bChrome\//.test(userAgent)) {
    return /\b(Vivaldi|YaBrowser|SamsungBrowser)\//.test(userAgent) ? 'other' : 'chrome';
  }
  if (/\bFirefox\//.test(userAgent)) {
    return 'firefox';
  }
  return 'other';
}

interface NavigatorSignals {
  userAgent?: string;
  userAgentData?: { brands?: { brand: string }[]; mobile?: boolean };
  brave?: unknown;
}

/** The browser this page runs in, or `other` where there is no browser, as on a server. */
export function visitorBrowser(): VisitorBrowser {
  const nav = (globalThis as { navigator?: NavigatorSignals }).navigator;
  if (!nav?.userAgent) {
    return 'other';
  }
  return browserOf({
    userAgent: nav.userAgent,
    brands: nav.userAgentData?.brands?.map((entry) => entry.brand) ?? [],
    brave: nav.brave !== undefined,
    mobile: nav.userAgentData?.mobile === true,
  });
}

/** The store that adds AI Wallet to `browser`, or null where no store lists it. */
export function walletStore(browser: VisitorBrowser): WalletStore | null {
  return STORE_OF[browser] ?? null;
}

/** Where a visitor on this browser adds AI Wallet: its store listing, or the wallet's page without one. */
export function walletInstallUrl(browser: VisitorBrowser): string {
  const store = walletStore(browser);
  if (store) {
    return store.url;
  }
  return browser === 'other' ? WALLET_PAGE : `${WALLET_PAGE}?browser=${browser}`;
}
