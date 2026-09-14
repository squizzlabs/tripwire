export class EsiClient {
  constructor({ baseUrl, timeoutMs, userAgent }, fetchImplementation = fetch) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
    this.userAgent = userAgent;
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

  async request(path, body) {
    const response = await this.fetch(`${this.baseUrl}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Accept: 'application/json',
        'User-Agent': this.userAgent,
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
