// The one AiConnect client the elements of a page share, so every element follows the same connection
// to the visitor's AI. The first element on the page creates it.

import { AiConnect } from '@tensorpass/aiconnect';

let client: AiConnect | null = null;

export function pageClient(): AiConnect {
  client ??= new AiConnect();
  return client;
}
