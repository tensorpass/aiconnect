// The model the account badge names: the plan's level by its name for TensorPass, such as Smart, and the
// model's own short name for OpenRouter, such as auto for openrouter/auto. The wallet names its model
// itself, so its name stays as it is.

import type { WebAccountId } from '@tensorpass/aiconnect';

export function modelLabel(model: string, account?: WebAccountId): string {
  if (account === 'tensorpass') {
    return model.charAt(0).toUpperCase() + model.slice(1);
  }
  if (account === 'openrouter') {
    return model.slice(model.lastIndexOf('/') + 1);
  }
  return model;
}
