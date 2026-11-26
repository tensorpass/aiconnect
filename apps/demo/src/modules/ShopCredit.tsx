// The shop's line under the question box: the TensorPass mark and a link to TensorPass that names the
// shop as its source, the way a site credits the AI features it runs.

import { BrandMark } from '@tensorpass/aiconnect-react';

const CREDIT_URL = 'https://tensorpass.app/?utm_source=demo&utm_medium=referral&utm_campaign=ai_credit';

export function ShopCredit({ label }: { label: string }) {
  return (
    <a className="shop-credit" href={CREDIT_URL} target="_blank" rel="noopener">
      <BrandMark className="shop-credit-mark" />{label}
    </a>
  );
}
