// Supported wire fields in the pinned provider's authorization schema and
// response-mode handling. Keep this list in sync when upgrading the provider.
const authorizationSingletons = new Set([
  'response_type',
  'response_mode',
  'request',
  'request_uri',
  'redirect_uri',
  'scope',
  'state',
  'client_id',
  'prompt',
  'display',
  'ui_locales',
  'max_age',
  'acr_values',
  'login_hint',
  'id_token_hint',
  'code_challenge',
  'code_challenge_method',
  'nonce',
  'claims',
  'dpop_jkt',
]);

const tokenSingletons = new Set([
  'grant_type',
  'client_id',
  'client_secret',
  'client_assertion',
  'client_assertion_type',
  'code',
  'code_verifier',
  'redirect_uri',
  'refresh_token',
  'scope',
]);

function hasDuplicate(params: URLSearchParams, singletons: Set<string>) {
  const seen = new Set<string>();
  for (const name of params.keys()) {
    if (!singletons.has(name)) continue;
    if (seen.has(name)) return true;
    seen.add(name);
  }
  return false;
}

// Inspect the raw request before the provider's form parser keeps only the
// last value. Resource indicators may repeat; unknown extensions stay with
// the provider. Clone the bounded body so its normal parsing is unchanged.
export async function oauthParameterError(request: Request, resource: string) {
  const url = new URL(request.url);
  const singletons =
    url.pathname === '/api/auth/oauth2/authorize'
      ? authorizationSingletons
      : url.pathname === '/api/auth/oauth2/token'
        ? tokenSingletons
        : undefined;
  if (!singletons) return;
  if (hasDuplicate(url.searchParams, singletons)) return 'invalid_request';
  if (
    request.method === 'POST' &&
    request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ===
      'application/x-www-form-urlencoded'
  ) {
    const form = new URLSearchParams(await request.clone().text());
    if (hasDuplicate(form, singletons)) return 'invalid_request';
    // Token processing restores repeated resources, but POST authorization
    // keeps only the last one. Check every value against Skyttel's sole
    // registered resource before that information is lost.
    const resources = form.getAll('resource');
    if (
      url.pathname === '/api/auth/oauth2/authorize' &&
      resources.length > 1 &&
      resources.some((value) => value !== resource)
    )
      return 'invalid_target';
  }
}
