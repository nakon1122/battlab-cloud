/* BATTLAB shared login (v2) — one account, one session for every *.battlab.net app.
 *
 * The Supabase session is kept in cookies scoped to ".battlab.net", so
 * battlab.net, www.battlab.net, batterycloud.battlab.net and voltol.battlab.net
 * all read the same session directly (no iframe, works on iOS Safari too).
 *
 * Pages use it exactly like before:
 *   supabase.createClient(URL, KEY, { auth: window.battlabAuthOptions })
 *
 * Only the browser login session lives here. ESP32 boards never load this file.
 */
(() => {
  'use strict';
  const REF = 'zpsxcdzkayqhzbdcdoed';
  const KEY = 'sb-' + REF + '-auth-token';
  const PREFIX = 'bl_sess';            // cookie names: bl_sess_n, bl_sess_0, bl_sess_1 ...
  const CHUNK = 3000;                  // stay well under the 4 KB cookie limit
  const MAX_AGE = 60 * 60 * 24 * 400;  // browsers cap at 400 days
  const host = location.hostname;
  const shared = host === 'battlab.net' || host.endsWith('.battlab.net');
  const attrs = '; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '') +
                (shared ? '; Domain=.battlab.net' : '');

  function readAll() {
    const out = {};
    for (const part of document.cookie.split(';')) {
      const i = part.indexOf('=');
      if (i < 0) continue;
      const name = part.slice(0, i).trim();
      if (name.startsWith(PREFIX + '_')) out[name] = part.slice(i + 1).trim();
    }
    return out;
  }
  // base64url(UTF-8) keeps cookies compact and cookie-safe
  function enc64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function dec64(b) {
    const bin = atob(b.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  // Drop fields the web apps never read, so the cookie stays small.
  function slim(value) {
    try {
      const o = JSON.parse(value);
      if (o && o.user) { delete o.user.identities; }
      return JSON.stringify(o);
    } catch { return value; }
  }
  const LIMIT = 6500;                  // total cookie bytes; above this keep the session per-site
  function getCookieValue() {
    const c = readAll();
    const n = parseInt(c[PREFIX + '_n'] || '', 10);
    if (!(n > 0 && n < 40)) return null;
    let enc = '';
    for (let i = 0; i < n; i++) {
      const piece = c[PREFIX + '_' + i];
      if (piece == null) return null;      // half written / damaged → treat as signed out
      enc += piece;
    }
    try { return dec64(enc); } catch { return null; }
  }
  function clearCookies() {
    for (const name of Object.keys(readAll())) {
      document.cookie = name + '=; Max-Age=0' + attrs;
      document.cookie = name + '=; Max-Age=0; Path=/';   // also drop any host-only copy
    }
  }
  function setCookieValue(value) {
    const enc = enc64(slim(value));
    if (enc.length > LIMIT) return false;   // too big for a cookie: caller falls back to localStorage
    const n = Math.ceil(enc.length / CHUNK);
    if (n < 1) return false;
    clearCookies();
    for (let i = 0; i < n; i++) {
      document.cookie = PREFIX + '_' + i + '=' + enc.slice(i * CHUNK, (i + 1) * CHUNK) + '; Max-Age=' + MAX_AGE + attrs;
    }
    document.cookie = PREFIX + '_n=' + n + '; Max-Age=' + MAX_AGE + attrs;
    return true;
  }
  function local(op, k, v) {
    try {
      if (op === 'get') return localStorage.getItem(k);
      if (op === 'set') return localStorage.setItem(k, v);
      if (op === 'del') return localStorage.removeItem(k);
    } catch { return null; }
  }
  function userIdOf(value) {
    try { return JSON.parse(value)?.user?.id || null; } catch { return null; }
  }

  let known = null;   // account this page is showing (updated by our own writes)
  const storage = {
    getItem(k) {
      if (k !== KEY) return local('get', k);
      let v = getCookieValue();
      if (v == null) {
        // Older per-site login (or an oversized session): move it into the shared cookie if it fits.
        const legacy = local('get', KEY);
        if (legacy && userIdOf(legacy)) {
          if (setCookieValue(legacy)) { v = getCookieValue(); local('del', KEY); }
          else v = legacy;
        }
      }
      return v;
    },
    setItem(k, v) {
      if (k !== KEY) return local('set', k, v);
      if (setCookieValue(v)) local('del', KEY);
      else { clearCookies(); local('set', KEY, v); }
      known = userIdOf(v);
    },
    removeItem(k) {
      if (k !== KEY) return local('del', k);
      clearCookies();
      local('del', KEY);
      known = null;
    }
  };

  window.battlabAuthOptions = {
    storageKey: KEY,
    storage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  };

  // Tell the page when the account changes in another BATTLAB app/tab
  // (login there, logout there). Pages can listen; by default we reload.
  known = userIdOf(storage.getItem(KEY));
  function check() {
    const now = userIdOf(getCookieValue() ?? local('get', KEY));
    if (now === known) return;
    const before = known;
    known = now;
    const ev = new CustomEvent('battlab-account-changed', { cancelable: true, detail: { before, now } });
    if (window.dispatchEvent(ev)) location.reload();
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  window.addEventListener('focus', check);
  setInterval(() => { if (!document.hidden) check(); }, 4000);

  window.battlabSession = {
    current() { try { return JSON.parse(getCookieValue() ?? local('get', KEY) ?? 'null'); } catch { return null; } },
    email() { return this.current()?.user?.email || ''; },
    clear() { clearCookies(); local('del', KEY); known = null; },
    sync(id) { known = id || null; }
  };
})();
