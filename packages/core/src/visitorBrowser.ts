// The visitor's browser, which names the button that adds AI Wallet and picks where it installs from.
// This is the one place that knows where each browser gets the wallet: today every browser goes to the
// wallet's page, which names the browser in its query; a browser's store listing replaces its address
// here once the listing is public.

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
const MOBILE = /Mobi|Android|iPhone|iPad|iPod/;

// The brand that names each Chromium browser in `userAgentData`, then the token of its user agent.
const CHROMIUM: { browser: VisitorBrowser; brand: string; token: RegExp }[] = [
  { browser: 'edge', brand: 'Microsoft Edge', token: /\bEdg\// },
  { browser: 'opera', brand: 'Opera', token: /\bOPR\// },
  { browser: 'brave', brand: 'Brave', token: /\bBrave\// },
];

/** The browser the signals describe. A phone, a tablet or a browser the wallet does not name is `other`. */
export function browserOf({ userAgent, brands, brave, mobile }: BrowserSignals): VisitorBrowser {
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
  if (brands.includes('Google Chrome') || (brands.length === 0 && /\bChrome\//.test(userAgent))) {
    return /\b(Vivaldi|YaBrowser|SamsungBrowser)\//.test(userAgent) ? 'other' : 'chrome';
  }
  if (/\bFirefox\//.test(userAgent)) {
    return 'firefox';
  }
  if (/\bVersion\/[\d.]+.*\bSafari\//.test(userAgent) && !/\b(Chrome|Chromium)\//.test(userAgent)) {
    return 'safari';
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

/** Where a visitor on this browser adds AI Wallet. */
export function walletInstallUrl(browser: VisitorBrowser): string {
  return browser === 'other' ? WALLET_PAGE : `${WALLET_PAGE}?browser=${browser}`;
}
