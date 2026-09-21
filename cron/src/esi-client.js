export class EsiRequestError extends Error {
  constructor(response, path) {
    super(`ESI ${response.status} ${response.statusText} for ${path}`);
    this.name = 'EsiRequestError';
    this.status = response.status;
    this.path = path;
  }
}

export class EsiSsoError extends Error {
  constructor(response, code) {
    super(`EVE SSO ${response.status} ${response.statusText} while refreshing token${code ? ` (${code})` : ''}`);
    this.name = 'EsiSsoError';
    this.status = response.status;
    this.code = code;
  }
}

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
    this.etagCache = new Map();
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

  getCharacter(characterId) {
    return this.request(`/characters/${characterId}/`);
  }

  getCorporation(corporationId) {
    return this.request(`/corporations/${corporationId}/`);
  }

  getAlliance(allianceId) {
    return this.request(`/alliances/${allianceId}/`);
  }

  getOnline(characterId, accessToken) {
    return this.authenticatedRequest(
      `/characters/${characterId}/online/`,
      accessToken,
    );
  }

  getLocation(characterId, accessToken) {
    return this.authenticatedRequest(
      `/characters/${characterId}/location/`,
      accessToken,
    );
  }

  getShip(characterId, accessToken) {
    return this.authenticatedRequest(
      `/characters/${characterId}/ship/`,
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
      // Only log the OAuth error code. Descriptions and raw response bodies can
      // contain sensitive details supplied by the remote service.
      let code;
      try {
        const body = await response.json();
        if (typeof body?.error === 'string' && /^[a-z][a-z0-9_]{0,63}$/i.test(body.error)) {
          code = body.error;
        }
      } catch {
        // Preserve the HTTP status when SSO returns an empty or invalid body.
      }
      throw new EsiSsoError(response, code);
    }
    return response.json();
  }

  authenticatedRequest(path, accessToken) {
    return this.request(path, undefined, accessToken);
  }

  async request(path, body, accessToken) {
    const cacheKey = body === undefined ? `${accessToken || ''}\n${path}` : null;
    const cached = cacheKey === null ? null : this.etagCache.get(cacheKey);
    const response = await this.fetch(`${this.baseUrl}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Accept: 'application/json',
        'User-Agent': this.userAgent,
        ...(this.compatibilityDate
          ? { 'X-Compatibility-Date': this.compatibilityDate }
          : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(cached?.etag ? { 'If-None-Match': cached.etag } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (response.status === 304 && cached) return cached.data;
    if (!response.ok) {
      throw new EsiRequestError(response, path);
    }

    const data = await response.json();
    if (cacheKey !== null) {
      const etag = response.headers?.get?.('etag');
      if (etag) {
        this.etagCache.delete(cacheKey);
        this.etagCache.set(cacheKey, { etag, data });
        if (this.etagCache.size > 1000) {
          this.etagCache.delete(this.etagCache.keys().next().value);
        }
      }
      else this.etagCache.delete(cacheKey);
    }
    return data;
  }
}
