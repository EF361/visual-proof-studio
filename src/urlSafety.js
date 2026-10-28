const dns = require('dns').promises;
const net = require('net');

/**
 * SSRF guard for URLs the server opens in a browser. Blocks loopback,
 * private, link-local, CGNAT, multicast and other non-public addresses
 * (IPv4 and IPv6, including IPv4-mapped IPv6).
 */
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||   // CGNAT
      (a === 169 && b === 254) ||              // link-local, cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) || // benchmarking
      a >= 224;                                // multicast, reserved, broadcast
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return lower === '::' || lower === '::1' ||
      lower.startsWith('fc') || lower.startsWith('fd') ||  // unique local
      /^fe[89ab]/.test(lower) ||                           // link-local
      lower.startsWith('ff');                              // multicast
  }
  return true; // not an IP we understand: treat as unsafe
}

const lookupCache = new Map();

/** True when the host resolves to any non-public address (or cannot resolve). */
async function isPrivateHost(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) return isPrivateIp(host);
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;

  if (!lookupCache.has(host)) {
    lookupCache.set(host, dns.lookup(host, { all: true, verbatim: true })
      .then(addrs => addrs.length === 0 || addrs.some(a => isPrivateIp(a.address)))
      .catch(() => true));
    setTimeout(() => lookupCache.delete(host), 60000).unref();
  }
  return lookupCache.get(host);
}

/**
 * Checks a target URL before recording.
 * @param {string} rawUrl
 * @param {{ allowOrigin?: string }} [options] origin always allowed (the studio's own /demo)
 * @returns {Promise<string>} the normalised URL
 * @throws Error with a user-facing message
 */
async function assertSafeTargetUrl(rawUrl, options = {}) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch (_) {
    throw Object.assign(new Error('Target URL is not valid.'), { code: 'UNSAFE_URL' });
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw Object.assign(new Error('Target URL must start with http:// or https://.'), { code: 'UNSAFE_URL' });
  }
  if (url.username || url.password) {
    throw Object.assign(new Error('Target URL must not contain a username or password.'), { code: 'UNSAFE_URL' });
  }
  if (options.allowOrigin && url.origin === options.allowOrigin) return url.href;
  if (await isPrivateHost(url.hostname)) {
    throw Object.assign(new Error(`Target URL points to a private or local address (${url.hostname}). Only public sites can be recorded.`), { code: 'UNSAFE_URL' });
  }
  return url.href;
}

/**
 * Playwright route handler that aborts browser requests to private
 * addresses, so redirects and page sub-requests cannot reach them either.
 */
function privateNetworkGuard(allowOrigin) {
  return async (route) => {
    let url;
    try {
      url = new URL(route.request().url());
    } catch (_) {
      return route.abort('blockedbyclient');
    }
    if (!['http:', 'https:'].includes(url.protocol)) return route.continue();
    if (allowOrigin && url.origin === allowOrigin) return route.continue();
    if (await isPrivateHost(url.hostname)) {
      console.warn(`[Safety] Blocked browser request to private address: ${url.host}`);
      return route.abort('blockedbyclient');
    }
    return route.continue();
  };
}

module.exports = {
  isPrivateIp,
  isPrivateHost,
  assertSafeTargetUrl,
  privateNetworkGuard
};
