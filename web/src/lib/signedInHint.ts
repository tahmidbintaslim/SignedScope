// A small per-browser hint that someone signed in here, so public pages can offer "Dashboard"
// without loading Clerk. Not used for access: /app still checks the real session.
const KEY = 'ss-signed-in';
export const setSignedInHint = (on: boolean) => { try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* blocked */ } };
export const readSignedInHint = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
