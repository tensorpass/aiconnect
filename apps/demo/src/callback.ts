// The demo's return page of a web sign in, the `signInCallback` of its client: it hands the provider's
// answer to the page that opened the sign in and closes, with nothing else of the demo.

import { finishSignIn } from '@tensorpass/aiconnect/callback';

finishSignIn();
