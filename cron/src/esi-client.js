export class EsiClient {
  constructor(
    {
      baseUrl,
      timeoutMs,
      userAgent,
      clientId,
      clientSecret,
      loginUrl,
      compatibilityDate,
    },
    fetchImplementation = fetch,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
    this.userAgent = userAgent;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.loginUrl = loginUrl || 'https://login.eveonline.com/v2/oauth/token';
    this.compatibilityDate = compatibilityDate;
    this.fetch = fetchImplementation;
  }

  getJumps() {
    return this.request('/v1/universe/system_jumps/');
  }

  getKills() {
    return this.request('/v2/universe/system_kills/');
  }

  getAffiliations(characterIds) {
    return this.request('/v2/characters/affiliation/', characterIds);
  }

  getNames(ids) {
    return this.request('/v3/universe/names', ids);
  }

  getOnline(characterId, accessToken) {
    return this.authenticatedRequest(
      `/latest/characters/${characterId}/online/`,
      accessToken,
    );
  }

  getLocation(characterId, accessToken) {
    return this.authenticatedRequest(
      `/latest/characters/${characterId}/location/`,
      accessToken,
    );
  }

  getShip(characterId, accessToken) {
    return this.authenticatedRequest(
      `/latest/characters/${characterId}/ship/`,
      accessToken,
    );
  }

  async refreshAccessToken(refreshToken) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('SSO_CLIENT and SSO_SECRET are required for backend tracking');
    }

    const response = await this.fetch(this.loginUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`EVE SSO ${response.status} ${response.statusText} while refreshing token`);
    }
    return response.json();
  }

  authenticatedRequest(path, accessToken) {
    return this.request(path, undefined, accessToken);
  }

  async request(path, body, accessToken) {
    const response = await this.fetch(`${this.baseUrl}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Accept: 'application/json',
        'User-Agent': this.userAgent,
        ...(this.compatibilityDate
          ? { 'X-Compatibility-Date': this.compatibilityDate }
          : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`ESI ${response.status} ${response.statusText} for ${path}`);
    }

    return response.json();
  }
}
