// The command line's sign in to TensorPass, a device authorization (RFC 8628): the gateway gives a device code
// and a short user code, the developer approves the code on the gateway's page in their browser, and the
// command line asks the token endpoint at the interval the gateway gave until the approval comes, the
// developer declines, or the code ends. Asking sooner than the interval makes the gateway answer slow_down,
// which adds five seconds to it.

export const CLI_CLIENT_ID = 'aiconnect-cli';
const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';
const SLOW_DOWN_SECONDS = 5;

export type CliFetch = (input: string, init: RequestInit) => Promise<Response>;

export interface DeviceCode {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresIn: number;
  interval: number;
}

export interface DeviceDeps {
  gateway: string;
  fetch: CliFetch;
  sleep: (seconds: number) => Promise<void>;
}

function form(fields: Record<string, string>): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(fields).toString(),
  };
}

async function jsonOf(response: Response): Promise<Record<string, unknown>> {
  return await response.json().catch(() => ({})) as Record<string, unknown>;
}

export async function requestDeviceCode({ gateway, fetch }: DeviceDeps): Promise<DeviceCode> {
  const response = await fetch(`${gateway}/oauth/device`, form({ client_id: CLI_CLIENT_ID, scope: 'sites' }));
  const body = await jsonOf(response);
  if (!response.ok || typeof body.device_code !== 'string' || typeof body.user_code !== 'string') {
    throw new Error(`TensorPass did not start the sign in (${response.status} ${String(body.error ?? '')})`.trim());
  }
  const verificationUri = String(body.verification_uri);
  return {
    deviceCode: body.device_code,
    userCode: body.user_code,
    verificationUri,
    verificationUriComplete: String(body.verification_uri_complete ?? verificationUri),
    expiresIn: Number(body.expires_in ?? 600),
    interval: Number(body.interval ?? 5),
  };
}

const ENDED: Record<string, string> = {
  access_denied: 'The sign in was declined on TensorPass.',
  expired_token: 'The code ended before it was approved. Run the command again.',
};

// The access token of scope `sites`, once the developer approves the code.
export async function waitForApproval(deps: DeviceDeps, code: DeviceCode): Promise<string> {
  let interval = code.interval;
  for (let waited = 0; waited < code.expiresIn; waited += interval) {
    await deps.sleep(interval);
    const response = await deps.fetch(`${deps.gateway}/oauth/token`, form({
      grant_type: DEVICE_GRANT, device_code: code.deviceCode, client_id: CLI_CLIENT_ID,
    }));
    const body = await jsonOf(response);
    if (response.ok && typeof body.access_token === 'string') {
      return body.access_token;
    }
    const error = String(body.error ?? '');
    if (error === 'slow_down') {
      interval += SLOW_DOWN_SECONDS;
    } else if (error !== 'authorization_pending') {
      throw new Error(ENDED[error] ?? `TensorPass refused the sign in (${response.status} ${error})`.trim());
    }
  }
  throw new Error(ENDED.expired_token);
}
