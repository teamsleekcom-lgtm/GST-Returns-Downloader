// Engine API base URL
// When served from FastAPI locally (same origin), use relative paths.
// When served from Vercel (different origin), must use absolute URL.
const isLocalEngine = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';

export const ENGINE_BASE = isLocalEngine ? '' : 'http://127.0.0.1:7842';
