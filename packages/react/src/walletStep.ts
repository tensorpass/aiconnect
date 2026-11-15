// The step a visitor without the wallet sees, in the connect window and in the modules: the words and the links
// for the route the client read for this device. A computer adds the wallet to its browser; Safari on an
// iPhone gets the AI Wallet app; another iPhone browser opens the page again in Safari or in the app.

import type { WalletRoute } from '@tensorpass/aiconnect';
import { alreadyAddedLine, installLabel, installText } from './messages.ts';
import type { PickerMessages } from './messages.ts';

export interface WalletLink {
  label: string;
  href: string;
  // The install pages open beside the site. A hand over stays in the tab, since iOS follows a universal link
  // or the Safari scheme only from a tap that opens it in place.
  newTab: boolean;
  // Every link after the first is a second choice.
  secondary: boolean;
  // The store install link carries the marks of the plans the wallet answers with.
  marks: boolean;
}

export interface WalletStep {
  title: string;
  text: string;
  // In Safari, on a Mac as on an iPhone, the line for a visitor who already added the wallet: Safari runs it
  // only on the sites the visitor allowed, so this site cannot find it until it is allowed on every website.
  aside?: string;
  links: WalletLink[];
}

function link(label: string, href: string, newTab: boolean, secondary = false): WalletLink {
  return { label, href, newTab, secondary, marks: false };
}

export function walletStep(route: WalletRoute, messages: PickerMessages): WalletStep {
  const { phone } = messages;
  switch (route.kind) {
    case 'install':
      return {
        title: messages.installTitle,
        text: installText(messages, route.browser),
        aside: alreadyAddedLine(messages, route.browser),
        links: [{ ...link(installLabel(messages, route.browser), route.url, true), marks: true }],
      };
    case 'iphoneSafari':
      return {
        title: phone.appTitle,
        text: phone.appText,
        aside: alreadyAddedLine(messages, 'safari'),
        links: [link(phone.appButton, route.appUrl, true)],
      };
    case 'iphoneBrowser':
      if (!route.safariUrl) {
        return {
          title: phone.appOnlyTitle,
          text: phone.appOnlyText,
          links: [link(phone.appBrowserButton, route.appUrl, false)],
        };
      }
      return {
        title: phone.switchTitle,
        text: phone.switchText,
        links: [
          link(phone.safariButton, route.safariUrl, false),
          link(phone.appBrowserButton, route.appUrl, false, true),
        ],
      };
  }
}

/** The attributes of a link of the step: a new tab for an install page, the same tab for a hand over. */
export function linkTarget(walletLink: WalletLink): { target?: string; rel?: string } {
  return walletLink.newTab ? { target: '_blank', rel: 'noreferrer' } : {};
}
