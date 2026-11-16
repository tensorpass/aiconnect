// The TensorPass plan of a visitor signed in on the page, as the chat offers it when the account has no
// subscription yet: the plans with their levels and price, read from the gateway, and the address of the
// gateway's billing page where the visitor subscribes. The web token opens a first subscription only, so
// the page can read and offer the plans without reaching the visitor's billing.

import { WalletRequestError } from '../walletProvider.ts';
import type { HttpFetch } from './openAiCompatibleSession.ts';
import { jsonOf, replyMessage, WEB_ACCOUNT_NAMES } from './webAccount.ts';

export interface PlanPrice {
  // In the currency's smallest unit, such as cents.
  amount: number;
  currency: string;
}

export interface PlanOffer {
  id: string;
  name: string;
  levels: string[];
  price: PlanPrice | null;
}

export interface PlanSubscription {
  // `active` once the plan answers; `none` for an account that never subscribed.
  status: string;
  plan: string | null;
  levels: string[];
  plans: PlanOffer[];
}

export interface PlanAccess {
  subscription(): Promise<PlanSubscription>;
  // The billing page's address for the plan, with a ticket it opens with once.
  billingPage(plan: string): Promise<string>;
}

export interface PlanAccessConfig {
  gateway: string;
  send: HttpFetch;
  // The headers of the current web token, renewed when it is close to its end.
  bearer: () => Promise<Record<string, string>>;
}

const NAME = WEB_ACCOUNT_NAMES.tensorpass;

async function answerOf(response: Response): Promise<Record<string, unknown>> {
  const body = await jsonOf(response);
  if (!response.ok) {
    const code = (body.error as { code?: unknown } | undefined)?.code;
    throw new WalletRequestError(`${NAME}: ${replyMessage(body, `the plan answered ${response.status}`)}`,
      response.status, undefined, typeof code === 'string' ? code : undefined);
  }
  return body;
}

export function planAccess({ gateway, send, bearer }: PlanAccessConfig): PlanAccess {
  return {
    async subscription() {
      const response = await send(`${gateway}/_plan/web/subscription`, { headers: await bearer() });
      return await answerOf(response) as unknown as PlanSubscription;
    },
    async billingPage(plan) {
      const response = await send(`${gateway}/_plan/web/billing-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await bearer() },
        body: JSON.stringify({ plan }),
      });
      const { url } = await answerOf(response);
      if (typeof url !== 'string') {
        throw new WalletRequestError(`${NAME}: the plan sent no billing page`, 502);
      }
      return url;
    },
  };
}
