// The chat's offer to subscribe, in place of the error, when the TensorPass account the visitor signed in
// with has no plan yet: the plans with their levels and monthly price as TensorPass sends them, and a
// button for each that opens TensorPass's billing page in a new tab. When the page regains focus, the
// subscription is read once; once it is active, the visitor's question goes out on its own.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlanAccess, PlanOffer as Offer } from '@tensorpass/aiconnect';
import { useAiConnect } from '../../AiConnectProvider.tsx';
import { modelLabel } from './accountModel.ts';
import { priceText } from './planPrice.ts';

type Plans = { kind: 'loading' } | { kind: 'ready'; plans: Offer[] } | { kind: 'failed' };

// The plans, read when the card shows, and the question sent again, once, when the plan is active.
function usePlans(access: PlanAccess | null, onActive: () => void) {
  const [plans, setPlans] = useState<Plans>(access ? { kind: 'loading' } : { kind: 'failed' });
  const activated = useRef(false);
  const latestOnActive = useRef(onActive);
  useEffect(() => {
    latestOnActive.current = onActive;
  });
  const read = useCallback(() => {
    if (!access) {
      return;
    }
    access.subscription().then((subscription) => {
      if (subscription.status !== 'active') {
        setPlans({ kind: 'ready', plans: subscription.plans });
      } else if (!activated.current) {
        activated.current = true;
        latestOnActive.current();
      }
    }, () => setPlans({ kind: 'failed' }));
  }, [access]);
  useEffect(() => {
    read();
    window.addEventListener('focus', read);
    return () => window.removeEventListener('focus', read);
  }, [read]);
  return { plans, read };
}

// Opens the tab during the click, as browsers allow, then sends it to the billing page once TensorPass
// gives its address. The tab gets no handle on the site's page.
function openBillingPage(access: PlanAccess, plan: string): Promise<void> {
  const tab = window.open('', '_blank');
  if (tab) {
    tab.opener = null;
  }
  return access.billingPage(plan).then((url) => {
    if (tab) {
      tab.location.href = url;
    } else {
      location.assign(url);
    }
  }, (error: unknown) => {
    tab?.close();
    throw error;
  });
}

function PlanRow({ offer, onChoose }: { offer: Offer; onChoose: () => void }) {
  const { locale, webMessages } = useAiConnect();
  const copy = webMessages.plan;
  return (
    <li className="aic-plan">
      <div className="aic-plan-copy">
        <p className="aic-plan-name">{offer.name}</p>
        <p className="aic-plan-levels">{offer.levels.map((level) => modelLabel(level, 'tensorpass')).join(', ')}</p>
      </div>
      {offer.price ? (
        <p className="aic-plan-price">{copy.perMonth.replace('{price}', priceText(offer.price, locale))}</p>
      ) : null}
      <button type="button" className="aic-button aic-plan-choose" onClick={onChoose}>
        {copy.choose.replace('{plan}', offer.name)}
      </button>
    </li>
  );
}

export function PlanOffer({ onActive }: { onActive: () => void }) {
  const { client, webMessages, moduleMessages } = useAiConnect();
  const [access] = useState(() => client.planAccess());
  const { plans, read } = usePlans(access, onActive);
  const [choice, setChoice] = useState<'none' | 'waiting' | 'failed'>('none');
  const copy = webMessages.plan;
  const choose = (plan: string) => {
    if (access) {
      openBillingPage(access, plan).then(() => setChoice('waiting'), () => setChoice('failed'));
    }
  };
  return (
    <div className="aic-plan-offer" role="status">
      <p className="aic-plan-title">{copy.title}</p>
      <p className="aic-plan-text">{choice === 'waiting' ? copy.waiting : copy.text}</p>
      {plans.kind === 'ready' ? (
        <ul className="aic-plans">
          {plans.plans.map((offer) => <PlanRow key={offer.id} offer={offer} onChoose={() => choose(offer.id)} />)}
        </ul>
      ) : null}
      {plans.kind === 'failed' || choice === 'failed' ? (
        <p className="aic-plan-text" role="alert">
          {copy.failed}{' '}
          <button type="button" className="aic-text-button" onClick={() => {
            setChoice('none');
            read();
          }}>{moduleMessages.retry}</button>
        </p>
      ) : null}
    </div>
  );
}
