// The return page script of a web sign in, for a site without a framework: a page that loads it with a
// script tag finishes the sign in on load, with nothing else of AI Connect.

import { finishSignIn } from '@tensorpass/aiconnect/callback';

finishSignIn();
